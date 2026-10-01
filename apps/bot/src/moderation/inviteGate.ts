/**
 * inviteGate.ts
 *
 * "Majburiy taklif" (MANDATORY_INVITE) foydali boti (2026-10): guruhga
 * YANGI qo'shilgan a'zo, admin belgilagan sondagi odamni (o'ziga xos
 * taklif havolasi orqali) taklif qilib qo'shmaguncha, shu guruhda yoza
 * olmaydi. Eski (feature yoqilishidan OLDIN qo'shilgan) a'zolarga
 * TEGMAYDI — ular uchun umuman nazorat qatori yaratilmaydi.
 *
 * Ikki alohida Telegram hodisasi ishlatiladi:
 *   - `message:new_chat_members` — HAR DOIM keladi, yangi a'zoni "kutib
 *     turuvchi" (invitedCount=0) deb ro'yxatga oladi (feature yoqiq bo'lsa).
 *   - `chat_member` — FAQAT bot shu guruhda ADMIN bo'lsa keladi, va
 *     YAGONA signal: qaysi taklif-havola orqali kirilgani (`invite_link`).
 *     Shu orqali "kim kimni taklif qildi" aniqlanadi.
 *
 * Xabar bloklanganda: xabar o'chiriladi, o'rniga muloyim, shaxsan
 * unga qaratilgan (reply) va qisqa muddatli (avtomatik o'chadigan)
 * eslatma yuboriladi — o'zining shaxsiy taklif havolasi bilan.
 */

import { Context } from 'grammy';
import { db } from '@kimbor/db';
import { scheduleMessageDeletion } from '../queue/deleteQueue';
import { isGroupOwner, isSuperAdmin } from './enforceModeration';

const FEATURE_KEY = 'MANDATORY_INVITE';
const NUDGE_AUTO_DELETE_MS = 3 * 60 * 1000; // 3 daqiqa — havolani ko'chirib olishga yetarli vaqt

// Guruh bo'yicha yoqilgan/o'chirilganligi va talab son — boshqa
// moderatsiya filtrlari bilan bir xil 1 daqiqalik kesh naqshi
// (admin panel alohida jarayonda ishlagani uchun).
const CONFIG_TTL_MS = 60 * 1000;
const configCache = new Map<number, { enabled: boolean; requiredCount: number; expiresAt: number }>();

async function getGateConfig(chatId: number): Promise<{ enabled: boolean; requiredCount: number }> {
  const cached = configCache.get(chatId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  try {
    const group = await db.cityGroup.findUnique({ where: { chatId: BigInt(chatId) } });
    if (!group) {
      const result = { enabled: false, requiredCount: 0, expiresAt: Date.now() + CONFIG_TTL_MS };
      configCache.set(chatId, result);
      return result;
    }
    const toggle = await db.groupFeatureToggle.findUnique({
      where: { cityGroupId_featureKey: { cityGroupId: group.id, featureKey: FEATURE_KEY } },
    });
    // requiredCount berilmagan/0 bo'lsa, HATTO yoqilgan deb belgilangan
    // bo'lsa ham xavfsiz tomonga (ochiq) og'amiz — raqam yo'q holda hech
    // kimni cheklash ma'nosiz va xavfli.
    const enabled = !!toggle?.isEnabled && !!toggle.requiredCount && toggle.requiredCount > 0;
    const result = { enabled, requiredCount: toggle?.requiredCount || 0, expiresAt: Date.now() + CONFIG_TTL_MS };
    configCache.set(chatId, result);
    return result;
  } catch (err) {
    console.error("Majburiy taklif sozlamasini o'qishda xato:", err);
    return { enabled: false, requiredCount: 0 };
  }
}

function cityGroupIdCacheKeyFor(chatId: number): number {
  return chatId;
}

const cityGroupIdCache = new Map<number, { id: string; expiresAt: number }>();
async function resolveCityGroupId(chatId: number): Promise<string | null> {
  const cached = cityGroupIdCache.get(cityGroupIdCacheKeyFor(chatId));
  if (cached && cached.expiresAt > Date.now()) return cached.id;
  const group = await db.cityGroup.findUnique({ where: { chatId: BigInt(chatId) }, select: { id: true } });
  if (!group) return null;
  cityGroupIdCache.set(chatId, { id: group.id, expiresAt: Date.now() + CONFIG_TTL_MS });
  return group.id;
}

/**
 * Guruhga yangi (haqiqiy, bot bo'lmagan) a'zo qo'shilganda chaqiriladi
 * (`message:new_chat_members`). Feature shu guruhda yoqilgan bo'lsagina,
 * ushbu a'zo uchun "kutib turuvchi" qator yaratadi (allaqachon bor bo'lsa
 * tegilmaydi — masalan guruhdan chiqib, qayta kirgan bo'lsa).
 */
export async function initGateForNewMember(chatId: number, telegramUserId: number): Promise<void> {
  const { enabled } = await getGateConfig(chatId);
  if (!enabled) return;
  const cityGroupId = await resolveCityGroupId(chatId);
  if (!cityGroupId) return;

  await db.groupInviteProgress.upsert({
    where: { cityGroupId_telegramUserId: { cityGroupId, telegramUserId: BigInt(telegramUserId) } },
    update: {},
    create: { cityGroupId, telegramUserId: BigInt(telegramUserId) },
  }).catch((err) => console.error('GroupInviteProgress yaratishda xato:', err));
}

/**
 * `chat_member` yangilanishida chaqiriladi — agar yangi a'zo BIZNING
 * tizim yaratgan shaxsiy taklif havolasi orqali kirgan bo'lsa, o'sha
 * havola egasining hisobini +1 oshiradi va chegaraga yetgan-yetmaganini
 * tekshiradi. Mos havola topilmasa (umumiy guruh havolasi orqali kirgan
 * bo'lsa) — jim o'tkazib yuboriladi.
 *
 * Qaytaradi: agar shu voqea bilan kimdir ENDI "ochilgan" (chegaraga
 * yetgan) bo'lsa, o'sha odamning telegramUserId'si — chaqiruvchi tomon
 * tabriklab qo'yishi uchun; aks holda `null`.
 */
export async function creditInviteIfTracked(
  chatId: number,
  usedInviteLink: string | undefined
): Promise<{ newlyVerifiedUserId: bigint } | null> {
  if (!usedInviteLink) return null;
  const cityGroupId = await resolveCityGroupId(chatId);
  if (!cityGroupId) return null;

  const link = await db.groupInviteLink.findUnique({ where: { inviteLink: usedInviteLink } });
  if (!link || link.cityGroupId !== cityGroupId) return null;

  const { requiredCount } = await getGateConfig(chatId);
  if (requiredCount <= 0) return null;

  const progress = await db.groupInviteProgress.findUnique({
    where: { cityGroupId_telegramUserId: { cityGroupId, telegramUserId: link.inviterTelegramId } },
  });
  // Taklif qiluvchining o'zi hali "kutib turuvchi" ro'yxatida bo'lmasligi
  // mumkin (masalan feature undan KEYIN yoqilgan bo'lsa) — baribir
  // hisoblashda davom etamiz (upsert), chunki havolaning o'zi faqat
  // feature yoqiq paytda yaratiladi.
  const wasVerified = progress?.isVerified ?? false;
  const updated = await db.groupInviteProgress.upsert({
    where: { cityGroupId_telegramUserId: { cityGroupId, telegramUserId: link.inviterTelegramId } },
    update: { invitedCount: { increment: 1 } },
    create: { cityGroupId, telegramUserId: link.inviterTelegramId, invitedCount: 1 },
  });

  if (!wasVerified && updated.invitedCount >= requiredCount) {
    await db.groupInviteProgress.update({
      where: { id: updated.id },
      data: { isVerified: true },
    });
    return { newlyVerifiedUserId: link.inviterTelegramId };
  }
  return null;
}

async function getOrCreatePersonalInviteLink(
  ctx: Context,
  chatId: number,
  cityGroupId: string,
  telegramUserId: number
): Promise<string | null> {
  const existing = await db.groupInviteLink.findUnique({
    where: { cityGroupId_inviterTelegramId: { cityGroupId, inviterTelegramId: BigInt(telegramUserId) } },
  });
  if (existing) return existing.inviteLink;

  try {
    const created = await ctx.api.createChatInviteLink(chatId, {
      name: `ref-${telegramUserId}`.slice(0, 32),
    });
    await db.groupInviteLink.create({
      data: { cityGroupId, inviterTelegramId: BigInt(telegramUserId), inviteLink: created.invite_link },
    });
    return created.invite_link;
  } catch (err) {
    // Odatda bot'da "invite link yaratish" huquqi yo'qligida yuz beradi —
    // bu holda cheklov ishlamaydi (havola berolmaymiz), lekin bot
    // qulamasligi uchun xatoni yutib, null qaytaramiz.
    console.error("Shaxsiy taklif havolasini yaratishda xato:", err);
    return null;
  }
}

/**
 * Guruhdagi matnli xabarni tekshiradi. Agar yuboruvchi hali "ochilmagan"
 * (yetarli odam taklif qilmagan) bo'lsa — xabarni o'chiradi, muloyim
 * eslatma yuboradi va `true` qaytaradi (chaqiruvchi BOSHQA HECH NARSA
 * uchun bu xabarni ishlatmasligi kerak). Aks holda `false`.
 */
export async function enforceInviteGate(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  const messageId = ctx.message?.message_id;
  if (!chatId || !userId || !messageId) return false;

  const { enabled, requiredCount } = await getGateConfig(chatId);
  if (!enabled) return false;

  const cityGroupId = await resolveCityGroupId(chatId);
  if (!cityGroupId) return false;

  const progress = await db.groupInviteProgress.findUnique({
    where: { cityGroupId_telegramUserId: { cityGroupId, telegramUserId: BigInt(userId) } },
  });
  // Qator yo'q — feature yoqilishidan OLDIN qo'shilgan eski a'zo, yoki
  // hali hech qanday join-hodisasi qayd etilmagan (masalan bot
  // o'chirilib-yoqilgan oraliqda) — ikkala holatda ham cheklanmaydi.
  if (!progress || progress.isVerified) return false;

  // Mustasnolar: bizning SUPER_ADMIN va guruhning haqiqiy egasi — xuddi
  // boshqa moderatsiya filtrlari bilan bir xil qoida.
  const telegramUserId = BigInt(userId);
  const [superAdmin, groupOwner] = await Promise.all([
    isSuperAdmin(telegramUserId),
    isGroupOwner(ctx, chatId, userId),
  ]);
  if (superAdmin || groupOwner) return false;

  if (progress.invitedCount >= requiredCount) {
    // Nazariy jihatdan bu yerga chat_member yo'li orqali allaqachon
    // "isVerified=true" bo'lishi kerak edi — ehtiyot chorasi sifatida
    // shu yerda ham to'g'rilab qo'yamiz, foydasiz bloklanib qolmasin.
    await db.groupInviteProgress.update({ where: { id: progress.id }, data: { isVerified: true } }).catch(() => {});
    return false;
  }

  // BLOKLASH: xabarni o'chirib, shaxsiy taklif havolasi bilan muloyim
  // eslatma yuboramiz.
  try {
    await ctx.deleteMessage();
  } catch (err) {
    console.error("Majburiy taklif: xabarni o'chirishda xato:", err);
  }

  const personalLink = await getOrCreatePersonalInviteLink(ctx, chatId, cityGroupId, userId);
  const remaining = requiredCount - progress.invitedCount;
  const firstName = ctx.from?.first_name || 'Do‘stim';

  const text =
    `Salom, ${firstName}! 👋\n\n` +
    `Bu guruhda yozish uchun avval kamida <b>${requiredCount}</b> kishini taklif qilishingiz kerak — ` +
    `hozircha <b>${progress.invitedCount}</b> kishi qo'shgansiz, yana <b>${remaining}</b> kishi qoldi.\n\n` +
    `Nega? Ko'proq odam bitta guruhda bo'lsa — hammaga foyda: savolingizga tezroq javob topiladi, siz ham boshqalarga yordam bera olasiz 🙌\n\n` +
    (personalLink
      ? `🔗 Shu shaxsiy havola orqali taklif qiling (avtomatik hisoblanadi):\n${personalLink}\n\n`
      : '') +
    `<i>Bu xabar ${NUDGE_AUTO_DELETE_MS / 60000} daqiqada o'chadi.</i>`;

  try {
    const sent = await ctx.reply(text, { parse_mode: 'HTML' });
    scheduleMessageDeletion(chatId, sent.message_id, NUDGE_AUTO_DELETE_MS).catch(() => {});
  } catch (err) {
    console.error("Majburiy taklif eslatmasini yuborishda xato:", err);
  }

  return true;
}

/** Chegaraga yetib, ENDI ochilgan odamni guruhda tabriklaydi. */
export async function announceInviteUnlocked(ctx: Context, chatId: number, telegramUserId: bigint): Promise<void> {
  try {
    const sent = await ctx.api.sendMessage(
      chatId,
      `🎉 Tabriklaymiz! <a href="tg://user?id=${telegramUserId}">Bir a'zo</a> yetarli odam taklif qildi va endi guruhda erkin yoza oladi.`,
      { parse_mode: 'HTML' }
    );
    scheduleMessageDeletion(chatId, sent.message_id, NUDGE_AUTO_DELETE_MS).catch(() => {});
  } catch (err) {
    console.error("Tabriklash xabarini yuborishda xato:", err);
  }
}
