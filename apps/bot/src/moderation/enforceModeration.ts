/**
 * enforceModeration.ts
 *
 * Guruh xabarlarini xavfsizlik nuqtai nazaridan tekshirib, buzilish
 * topilsa AMALGA OSHIRADI: xabarni o'chiradi + foydalanuvchini 1 soatga
 * "jim" qiladi (restrictChatMember). Admin bilan kelishilgan qoidalar
 * (2026-09):
 *   - Ogohlantirishsiz, DARHOL o'chirish + jim qilish (1-marta qoidabuzarlik).
 *   - Jim qilish muddati: 1 soat.
 *   - Mustasno: FAQAT bizning SUPER_ADMIN (User.role) va shu guruhning
 *     haqiqiy egasi (Telegram "creator" statusi) — oddiy Telegram-adminlar
 *     ham filtrga tushadi.
 *   - Flud: agar xabar HAQIQIY xizmat so'rovi bo'lsa (hasPossibleServiceSignal
 *     orqali aniqlanadi), hech qachon flud deb belgilanmaydi — odam
 *     shoshilinch bir narsa kutayotgan bo'lishi mumkin (masalan "taksi
 *     kerak" deb necha marta yozsa ham).
 *
 * "FOYDALI BOTLAR" (2026-09): har bir filtr endi GURUH DARAJASIDA alohida
 * yoqiladi/o'chiriladi (GroupFeatureToggle jadvali, admin panel > Yana >
 * Foydali botlar). Standart holat — YANGI guruhda HAMMASI O'CHIQ, admin
 * o'zi kerakli botlarni tanlab yoqadi. Bu ro'yxat har xabarda tekshirilishi
 * kerak bo'lgani uchun qisqa muddat (60s) xotirada keshlanadi — admin panel
 * boshqa jarayonda (API) ishlaydi, shuning uchun o'zgarish botga yetib
 * borishi bir daqiqagacha vaqt olishi mumkin.
 */

import { Context } from 'grammy';
import { db } from '@kimbor/db';
import { checkEasyModerationFilters, normalizeText, ModerationCategory } from '@kimbor/core';
import { hasPossibleServiceSignal } from '../filter/aiClassifier';
import { checkAndRecordFlood } from './floodTracker';

const MUTE_DURATION_MS = 60 * 60 * 1000; // 1 soat

// Bizning O'ZIMIZNING havolalarimiz — HAR DOIM, BARCHA guruhlarda ruxsat
// etilgan (admin alohida qo'shishi shart emas), "Spam-link filtri" yoqilgan
// bo'lsa ham. Aks holda "Habar yuborish" (broadcast) orqali yuborilgan
// o'zimizning reklama/bot havolamiz ham o'chirilib ketardi.
const GLOBAL_ALWAYS_ALLOWED_LINKS = ['t.me/olmaliq_bot', process.env.DOMAIN || 'olmaliq.online'];

const ENABLED_FEATURES_TTL_MS = 60 * 1000; // 1 daqiqa
interface GroupModerationConfig {
  enabledKeys: Set<string>;
  allowedLinkEntries: string[];
}
const groupConfigCache = new Map<number, { config: GroupModerationConfig; expiresAt: number }>();

/**
 * Shu guruhda YOQILGAN "foydali botlar" ro'yxatini VA ruxsat etilgan
 * havola-domenlarini birga qaytaradi (bitta so'rovda). Hech narsa
 * yoqilmagan bo'lsa (standart holat) bo'sh Set qaytadi. CityGroup
 * topilmasa ham xavfsiz tomonga xato qiladi (YOQILMAGAN deb hisoblanadi).
 */
async function getGroupModerationConfig(chatId: number): Promise<GroupModerationConfig> {
  const cached = groupConfigCache.get(chatId);
  if (cached && cached.expiresAt > Date.now()) return cached.config;

  try {
    const group = await db.cityGroup.findUnique({
      where: { chatId: BigInt(chatId) },
      include: {
        featureToggles: { where: { isEnabled: true } },
        allowedDomains: true,
      },
    });
    const config: GroupModerationConfig = {
      enabledKeys: new Set((group?.featureToggles || []).map((f) => f.featureKey)),
      allowedLinkEntries: [...GLOBAL_ALWAYS_ALLOWED_LINKS, ...(group?.allowedDomains || []).map((d) => d.domain)],
    };
    groupConfigCache.set(chatId, { config, expiresAt: Date.now() + ENABLED_FEATURES_TTL_MS });
    return config;
  } catch (err) {
    console.error("Foydali botlar ro'yxatini o'qishda xato:", err);
    return { enabledKeys: new Set(), allowedLinkEntries: GLOBAL_ALWAYS_ALLOWED_LINKS };
  }
}

// Guruh egasi (creator) statusini qisqa muddat (10 daqiqa) keshlaymiz —
// bu deyarli hech qachon o'zgarmaydigan ma'lumot, har xabarda Telegram
// API'ga qayta so'rov yubormaslik uchun.
const ownerCache = new Map<string, { isOwner: boolean; expiresAt: number }>();

async function isGroupOwner(ctx: Context, chatId: number, userId: number): Promise<boolean> {
  const cacheKey = `${chatId}:${userId}`;
  const cached = ownerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.isOwner;

  try {
    const member = await ctx.api.getChatMember(chatId, userId);
    const isOwner = member.status === 'creator';
    ownerCache.set(cacheKey, { isOwner, expiresAt: Date.now() + 10 * 60 * 1000 });
    return isOwner;
  } catch (err) {
    console.error('getChatMember xatosi (moderatsiya mustasno tekshiruvi):', err);
    return false;
  }
}

async function isSuperAdmin(telegramUserId: bigint): Promise<boolean> {
  try {
    const user = await db.user.findUnique({ where: { telegramId: telegramUserId } });
    return user?.role === 'SUPER_ADMIN';
  } catch (err) {
    console.error('SUPER_ADMIN tekshiruvi xatosi:', err);
    return false;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  PROFANITY: "so'kinish/haqorat",
  SPAM_LINK: 'shubhali havola',
  GAMBLING: 'qimor reklamasi',
  SCAM: 'firibgarlik iborasi',
  FLOOD: 'flud (spam-bombardimon)',
};

/**
 * Guruh xabarini tekshiradi. Buzilish topilsa — o'chiradi, jim qiladi,
 * va `true` qaytaradi (chaqiruvchi tomon shu xabarni BOSHQA HECH NARSA
 * uchun qayta ishlamasligi kerak — masalan searchListings'ga yuborilmasin).
 * Buzilish topilmasa — `false`.
 */
export async function enforceModeration(
  ctx: Context,
  messageText: string
): Promise<boolean> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  const messageId = ctx.message?.message_id;
  if (!chatId || !userId || !messageId) return false;

  // 0) Shu guruhda umuman biror "foydali bot" yoqilganmi? Yo'q bo'lsa
  // (standart holat) — hech qanday DB/Telegram API so'rovi qilmasdan
  // darhol chiqib ketamiz, boshqa hamma guruh uchun bu deyarli bepul.
  const { enabledKeys: enabledFeatures, allowedLinkEntries } = await getGroupModerationConfig(chatId);
  if (enabledFeatures.size === 0) return false;

  // Mustasnolar — filtr ularga umuman tegmaydi.
  const telegramUserId = BigInt(userId);
  const [superAdmin, groupOwner] = await Promise.all([
    isSuperAdmin(telegramUserId),
    isGroupOwner(ctx, chatId, userId),
  ]);
  if (superAdmin || groupOwner) return false;

  // 1) "Oson" (AI'siz) filtrlar — FAQAT shu guruhda yoqilganlari
  // tekshiriladi (so'kinish, spam-link, qimor, firibgarlik).
  const easyCategories = new Set(
    ['PROFANITY', 'SPAM_LINK', 'GAMBLING', 'SCAM'].filter((k) => enabledFeatures.has(k))
  ) as Set<ModerationCategory>;
  const easyResult = checkEasyModerationFilters(messageText, easyCategories, allowedLinkEntries);
  let category: string | null = easyResult.category;

  // 2) Flud — FAQAT shu guruhda "Flud filtri" yoqilgan bo'lsa tekshiriladi.
  // "Bir xil xabar takrorlanishi" belgisi FAQAT xabar haqiqiy xizmat
  // so'rovi BO'LMASA hisobga olinadi (haqiqiy so'rovchi — masalan "taksi
  // kerak" deb necha marta yozsa ham — hech qachon jazolanmasligi kerak).
  // Texnik hujum chegarasi ("rate" — 10s/15+ xabar) esa mazmunidan qat'iy
  // nazar HAR DOIM tekshiriladi.
  if (!category && enabledFeatures.has('FLOOD')) {
    const normalized = normalizeText(messageText);
    const looksLikeRealRequest = hasPossibleServiceSignal(normalized);
    const flood = await checkAndRecordFlood(chatId, userId, normalized);
    if (flood.isFlood && (flood.reason === 'rate' || !looksLikeRealRequest)) {
      category = 'FLOOD';
    }
  }

  if (!category) return false;

  // Amalga oshirish: o'chirish, ogohlantirishsiz.
  try {
    await ctx.api.deleteMessage(chatId, messageId);
  } catch (err) {
    console.error(`Moderatsiya: xabarni o'chirib bo'lmadi (${category}):`, err);
  }

  // SPAM_LINK — endi HAR QANDAY (hatto zararsiz) havolani ham tutadi,
  // shuning uchun boshqa filtrlardan farqli, 1 soatlik "jim" qilish
  // QO'LLANILMAYDI — faqat xabar o'chiriladi. Qolgan 4 filtr esa haqiqiy
  // qoidabuzarlik belgisi bo'lgani uchun darhol jim qilinadi.
  if (category !== 'SPAM_LINK') {
    try {
      await ctx.api.restrictChatMember(
        chatId,
        userId,
        {
          can_send_messages: false,
          can_send_audios: false,
          can_send_documents: false,
          can_send_photos: false,
          can_send_videos: false,
          can_send_video_notes: false,
          can_send_voice_notes: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
        },
        { until_date: Math.floor((Date.now() + MUTE_DURATION_MS) / 1000) }
      );
    } catch (err) {
      // Eng keng tarqalgan sabab: botda "a'zolarni cheklash" admin huquqi
      // yo'q. Xabar allaqachon o'chirilgan (agar muvaffaqiyatli bo'lsa),
      // shuning uchun bu jim yutiladi — lekin logga aniq yoziladi, shunda
      // admin panelida ko'rish mumkin bo'ladi.
      console.error(`Moderatsiya: userni jim qilib bo'lmadi (huquq yetishmasligi mumkin, ${category}):`, err);
    }
  }

  db.moderationLog.create({
    data: {
      chatId: BigInt(chatId),
      telegramUserId,
      category,
      rawMessage: messageText.slice(0, 500),
    },
  }).catch((err) => console.error('ModerationLog yozishda xato:', err));

  const muteNote = category === 'SPAM_LINK' ? '' : ', user 1 soatga jim qilindi';
  console.log(`🛡 Moderatsiya: ${CATEGORY_LABELS[category] || category} — xabar o'chirildi${muteNote} (chat ${chatId}, user ${userId})`);

  return true;
}
