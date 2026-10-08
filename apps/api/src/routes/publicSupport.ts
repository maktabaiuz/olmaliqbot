import { db } from '@kimbor/db';
import { calculateBayesianRating, getOpenState } from '@kimbor/core';
import { verifyTelegramInitData } from './authSecurity';

/**
 * Foydalanuvchi ilovasi (2026-10) uchun yordamchilar. Admin API'dan
 * BUTUNLAY alohida: bu yerda hech qanday admin huquqi yo'q, faqat o'qish
 * va taklif yuborish.
 */

export interface PublicUser {
  /** Telegram initData'dagi xom user obyekti (til, username, premium) */
  raw?: any;
  telegramId: bigint;
  firstName: string | null;
}

/** Telegram initData imzosi tekshiriladi — boshqa kirish usuli yo'q. */
export function authPublicUser(req: any): PublicUser | null {
  const initData = String(req.headers['x-init-data'] || '');
  // Ilova yangi botda (USER_BOT_TOKEN) ochiladi; asosiy bot ichidan ham
  // ochilishi mumkin — ikkala imzo ham qabul qilinadi.
  let res = verifyTelegramInitData(initData, process.env.USER_BOT_TOKEN);
  if (!res.isValid) res = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!res.isValid || !res.telegramId) return null;
  return { telegramId: res.telegramId, firstName: res.userRaw?.first_name ?? null, raw: res.userRaw ?? null };
}

let cityCache: { id: string; expiresAt: number } | null = null;
export async function getPublicCityId(): Promise<string> {
  if (cityCache && cityCache.expiresAt > Date.now()) return cityCache.id;
  const city = (await db.city.findFirst({ where: { slug: 'olmaliq' } })) || (await db.city.findFirst());
  const id = city?.id || 'default_city';
  cityCache = { id, expiresAt: Date.now() + 10 * 60_000 };
  return id;
}

// ---------- Majburiy obuna (bot bilan bir xil qoida) ----------
const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);
const NOT_MEMBER_ERRORS = ['PARTICIPANT_ID_INVALID', 'USER_NOT_PARTICIPANT', 'user not found', 'chat not found'];
const subOkCache = new Map<string, number>();

function chatIdOf(ch: { chatId: string | null; url: string }): string | null {
  if (ch.chatId) return ch.chatId;
  const m = ch.url.trim().match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,})\/?$/);
  return m ? `@${m[1]}` : null;
}

/** Obuna bo'linmagan kanallar ro'yxati (bo'sh = hammasi joyida). Telegram
 * xatosida (sozlama muammosi) — botdagidek o'tkazib yuboriladi. */
export async function getMissingChannelsForUser(telegramId: bigint) {
  const key = telegramId.toString();
  const ok = subOkCache.get(key);
  if (ok && ok > Date.now()) return [];
  const channels = await db.requiredChannel.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, title: true, url: true, chatId: true },
  });
  const token = process.env.BOT_TOKEN;
  if (!token || channels.length === 0) return [];
  const missing: { id: string; title: string; url: string }[] = [];
  for (const ch of channels) {
    const chatId = chatIdOf(ch);
    if (!chatId) continue;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${key}`
      );
      const json: any = await res.json();
      if (json.ok) {
        const m = json.result;
        const isMember = MEMBER_STATUSES.has(m.status) && !(m.status === 'restricted' && !m.is_member);
        if (!isMember) missing.push({ id: ch.id, title: ch.title, url: ch.url });
      } else if (NOT_MEMBER_ERRORS.some((e) => String(json.description || '').includes(e))) {
        missing.push({ id: ch.id, title: ch.title, url: ch.url });
      }
    } catch {
      // Tarmoq xatosi — foydalanuvchini to'smaymiz.
    }
  }
  if (missing.length === 0) subOkCache.set(key, Date.now() + 10 * 60_000);
  return missing;
}

export const UNASSIGNED_LANDMARK = 'MFY tanlanmagan';

// ---------- Yozuv kartasi (TELEFONSIZ) ----------
export const PUBLIC_LISTING_SELECT = {
  id: true,
  name: true,
  type: true,
  workFrom: true,
  workTo: true,
  badges: true,
  specificServices: true,
  approxPrice: true,
  roomCount: true,
  rentPrice: true,
  rentPriceCurrency: true,
  rentTermType: true,
  photoUrls: true,
  description: true,
  latitude: true,
  longitude: true,
  mapUrl: true,
  verification: true,
  category: { select: { id: true, name: true, emoji: true, objectType: true } },
  primaryLandmark: { select: { id: true, name: true } },
  serviceAreaLandmarks: { select: { id: true, name: true } },
  reviews: { select: { isPositive: true } },
} as const;

/** Telefon raqami ATAYLAB yo'q — u faqat /phone orqali, limit bilan ochiladi. */
export function toPublicCard(l: any) {
  const up = (l.reviews || []).filter((r: any) => r.isPositive).length;
  const down = (l.reviews || []).length - up;
  const open = getOpenState(l.workFrom, l.workTo);
  return {
    id: l.id,
    name: l.name,
    type: l.type,
    category: l.category,
    // "MFY tanlanmagan" — vaqtinchalik joy, foydalanuvchiga ko'rsatilmaydi
    landmark: l.primaryLandmark?.name === UNASSIGNED_LANDMARK ? null : l.primaryLandmark,
    serviceAreas: l.serviceAreaLandmarks || [],
    verified: l.verification === 'VERIFIED',
    rating: { score: calculateBayesianRating(up, down), up, down },
    open,
    workFrom: l.workFrom,
    workTo: l.workTo,
    badges: l.badges,
    services: l.specificServices,
    price: l.approxPrice,
    rent: l.rentPrice != null ? { price: l.rentPrice, currency: l.rentPriceCurrency, term: l.rentTermType, rooms: l.roomCount } : null,
    photoUrls: l.photoUrls,
    description: l.description,
    location: l.latitude != null ? { lat: l.latitude, lng: l.longitude } : null,
    mapUrl: l.mapUrl,
  };
}

// ---------- Limitlar ----------
export const PHONE_LIMIT_PER_HOUR = 20;
export const PHONE_LIMIT_PER_DAY = 60;
export const CANDIDATE_LIMIT_PER_DAY = 5;
