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
 * Xabar bloklanganda: xabar o'chiriladi, GURUHNING O'ZIDA (2026-10,
 * foydalanuvchi so'rovi bo'yicha — avval DM orqali sinalgan edi, lekin
 * guruhda, qisqa va tushunarli ko'rinishni afzal ko'rdi) qisqa, aniq
 * eslatma qoldiriladi: nechta odam kerakligi, qancha qolgani va nega
 * foydali ekani — pastida esa HAQIQIY Telegram tugma (rang — admin
 * tanlagan, 3 ta variantdan biri) orqali shaxsiy taklif havolasi.
 * 5 daqiqada o'zi o'chib ketadi.
 */

import { Context } from 'grammy';
import { db } from '@kimbor/db';
import { scheduleMessageDeletion } from '../queue/deleteQueue';
import { isGroupOwner, isSuperAdmin } from './enforceModeration';

const FEATURE_KEY = 'MANDATORY_INVITE';
const NUDGE_AUTO_DELETE_MS = 5 * 60 * 1000; // 5 daqiqa (foydalanuvchi so'ragan muddat)

// Bitta odam ketma-ket bir necha marta yozishga urinsa (hali bloklangan
// holatda), har safar yangi DM/eslatma yubormasdan, qisqa "sovish" vaqti
// qo'yamiz — aks holda u DM'da spam ko'rib, botni bloklab qo'yishi mumkin.
const RENOTIFY_COOLDOWN_MS = 60 * 1000;
const lastNudgeAt = new Map<string, number>();

// Guruh bo'yicha yoqilgan/o'chirilganligi va talab son — boshqa
// moderatsiya filtrlari bilan bir xil 1 daqiqalik kesh naqshi
// (admin panel alohida jarayonda ishlagani uchun).
const CONFIG_TTL_MS = 60 * 1000;
interface GateConfig {
  enabled: boolean;
  requiredCount: number;
  linkLabel: string | null;
  linkButtonStyle: 'primary' | 'success' | 'danger' | null;
  linkUrl: string | null;
}
const configCache = new Map<number, GateConfig & { expiresAt: number }>();

/**
 * Admin qo'shimcha tugmasining manzili. MUHIM (2026-10, real test): admin
 * havolani "Tugma matni" maydoniga yozib qo'ygan edi ("@olmaliq_bot") —
 * o'sha paytda havola maydoni umuman yo'q edi. Shunday eski yozuvlar
 * ham ishlashi uchun, matn o'zi @username/havola ko'rinishida bo'lsa,
 * manzil shundan olinadi.
 */
function resolveAdminLinkUrl(linkUrl: string | null | undefined, linkLabel: string | null | undefined): string | null {
  if (linkUrl) return linkUrl;
  const label = (linkLabel || '').trim();
  if (/^@[A-Za-z0-9_]{4,}$/.test(label)) return `https://t.me/${label.slice(1)}`;
  if (/^https?:\/\/\S+$/i.test(label)) return label;
  if (/^(t\.me|telegram\.me)\/\S+$/i.test(label)) return `https://${label}`;
  return null;
}

async function getGateConfig(chatId: number): Promise<GateConfig> {
  const cached = configCache.get(chatId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const empty: GateConfig = { enabled: false, requiredCount: 0, linkLabel: null, linkButtonStyle: null, linkUrl: null };
  try {
    const group = await db.cityGroup.findUnique({ where: { chatId: BigInt(chatId) } });
    if (!group) {
      configCache.set(chatId, { ...empty, expiresAt: Date.now() + CONFIG_TTL_MS });
      return empty;
    }
    const toggle = await db.groupFeatureToggle.findUnique({
      where: { cityGroupId_featureKey: { cityGroupId: group.id, featureKey: FEATURE_KEY } },
    });
    // requiredCount berilmagan/0 bo'lsa, HATTO yoqilgan deb belgilangan
    // bo'lsa ham xavfsiz tomonga (ochiq) og'amiz — raqam yo'q holda hech
    // kimni cheklash ma'nosiz va xavfli.
    const enabled = !!toggle?.isEnabled && !!toggle.requiredCount && toggle.requiredCount > 0;
    const result: GateConfig = {
      enabled,
      requiredCount: toggle?.requiredCount || 0,
      linkLabel: toggle?.linkLabel || null,
      linkButtonStyle: (toggle?.linkButtonStyle as GateConfig['linkButtonStyle']) || null,
      linkUrl: resolveAdminLinkUrl(toggle?.linkUrl, toggle?.linkLabel),
    };
    configCache.set(chatId, { ...result, expiresAt: Date.now() + CONFIG_TTL_MS });
    return result;
  } catch (err) {
    console.error("Majburiy taklif sozlamasini o'qishda xato:", err);
    return empty;
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

  const { enabled, requiredCount, linkLabel, linkButtonStyle, linkUrl } = await getGateConfig(chatId);
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

  // BLOKLASH: xabarni darhol o'chiramiz — bu qism har doim bajariladi,
  // "sovish" davrida ham (aks holda odam bloklanmagan his qilib qoladi).
  try {
    await ctx.deleteMessage();
  } catch (err) {
    console.error("Majburiy taklif: xabarni o'chirishda xato:", err);
  }

  // Sovish davri: xabarni o'chirib qo'yamiz, lekin yangi eslatma bilan
  // SPAM qilmaymiz — odam qisqa vaqt ichida qayta-qayta yozsa ham.
  const cooldownKey = `${chatId}:${userId}`;
  const lastAt = lastNudgeAt.get(cooldownKey) || 0;
  if (Date.now() - lastAt < RENOTIFY_COOLDOWN_MS) return true;
  lastNudgeAt.set(cooldownKey, Date.now());

  const personalLink = await getOrCreatePersonalInviteLink(ctx, chatId, cityGroupId, userId);
  const remaining = requiredCount - progress.invitedCount;
  const firstName = ctx.from?.first_name || 'Do‘stim';

  // Qisqa, mazmunli matn: kim, nechta kerak, nechta qoldi, nega foydali —
  // havolaning o'zi matn ICHIDA emas, pastdagi HAQIQIY Telegram tugmada
  // (shu bilan "silka" chiroyli, rangli tugma ko'rinishida chiqadi).
  const text =
    `👋 <a href="tg://user?id=${userId}">${escapeHtml(firstName)}</a>, bu guruhda yozish uchun odam taklif qiling!\n\n` +
    `Kerak: <b>${requiredCount}</b> kishi · Qo'shdingiz: <b>${progress.invitedCount}</b> · Qoldi: <b>${remaining}</b>\n\n` +
    `Nega? Ko'proq odam bo'lsa — hammaga foyda: savolingizga tezroq javob topiladi 🙌\n\n` +
    `<i>Bu xabar ${NUDGE_AUTO_DELETE_MS / 60000} daqiqada o'chadi.</i>`;

  // 1) TAKLIF tugmasi: Telegram'ning o'zining "Ulashish" oynasini ochadi —
  //    odam do'stlarini tanlaydi, shaxsiy havola ularga O'ZI yuboriladi
  //    (mashhur "do'st taklif qiling" botlari aynan shunday ishlaydi). Avval
  //    tugma guruhning o'z havolasini ochardi — guruhda allaqachon turgan
  //    odam uchun bu hech narsa qilmagandek ko'rinardi (real test natijasi).
  // 2) Admin belgilagan QO'SHIMCHA tugma (ixtiyoriy) — matni va rangi admin
  //    panelidan, masalan @olmaliq_bot yoki kanal.
  const rows: { text: string; url: string; style?: 'primary' | 'success' | 'danger' }[][] = [];
  if (personalLink) {
    const groupTitle = (ctx.chat && 'title' in ctx.chat && ctx.chat.title) || 'guruh';
    const shareText = `"${groupTitle}" guruhiga qo'shiling 👇`;
    rows.push([
      {
        text: "📤 Do'stlarni taklif qilish",
        url: `https://t.me/share/url?url=${encodeURIComponent(personalLink)}&text=${encodeURIComponent(shareText)}`,
        style: 'success',
      },
    ]);
  }
  if (linkUrl) {
    rows.push([
      {
        text: linkLabel || 'Havola',
        url: linkUrl,
        ...(linkButtonStyle ? { style: linkButtonStyle } : {}),
      },
    ]);
  }
  const replyMarkup = rows.length > 0 ? { inline_keyboard: rows } : undefined;

  try {
    const sent = await ctx.reply(text, { parse_mode: 'HTML', reply_markup: replyMarkup as any });
    scheduleMessageDeletion(chatId, sent.message_id, NUDGE_AUTO_DELETE_MS).catch(() => {});
  } catch (err) {
    console.error("Majburiy taklif eslatmasini yuborishda xato:", err);
  }

  return true;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
