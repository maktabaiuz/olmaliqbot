import { Context } from 'grammy';
import { db } from '@kimbor/db';

/**
 * Foydalanuvchilarni raqamsiz — faqat Telegram ID bilan — kuzatish (2026-10-08).
 *
 *  - Guruhda yozgan HAR BIR odam (bot javob berganmi-yo'qmi) User sifatida
 *    saqlanadi: ism, @username, til, Premium, birinchi ko'ringan guruh.
 *  - Shaxsiy chatda: oxirgi faollik, /start belgisi (qaysi guruh reklamasidan
 *    kelgani — t.me/<bot>?start=g<chatId>), botni birinchi ishga tushirgan payt.
 *  - Botni bloklash/qayta yoqish — Telegram'ning my_chat_member xabaridan.
 *
 * Hammasi fire-and-forget: botning javob tezligiga ta'sir qilmaydi.
 */

const SERVICE_USER_IDS = new Set([777000, 1087968824, 136817688]); // Telegram, anonim admin, kanal nomidan
const GROUP_THROTTLE_MS = 30 * 60_000;
const lastGroupTouch = new Map<number, number>();

function profileOf(ctx: Context) {
  const f = ctx.from!;
  return {
    firstName: f.first_name || null,
    lastName: f.last_name || null,
    username: f.username || null,
    languageCode: f.language_code || null,
    isPremium: !!(f as any).is_premium,
  };
}

/** Shaxsiy chatdagi har bir yangilanish. */
export function trackPrivateUser(ctx: Context, cityId: string): void {
  if (!ctx.from || ctx.from.is_bot) return;
  const now = new Date();
  const p = profileOf(ctx);
  db.user
    .upsert({
      where: { telegramId: BigInt(ctx.from.id) },
      update: { ...p, cityId, lastSeenAt: now },
      create: { telegramId: BigInt(ctx.from.id), ...p, role: 'USER', cityId, firstSeenVia: 'bot', lastSeenAt: now },
    })
    .catch((err) => console.error('trackPrivateUser:', err.message));
}

/** Guruhda yozgan odam — 30 daqiqada bir martadan ko'p yozilmaydi. */
export function trackGroupUser(ctx: Context, cityId: string): void {
  const f = ctx.from;
  const chatId = ctx.chat?.id;
  if (!f || f.is_bot || !chatId || SERVICE_USER_IDS.has(f.id) || (ctx.message as any)?.sender_chat) return;
  const last = lastGroupTouch.get(f.id) || 0;
  if (Date.now() - last < GROUP_THROTTLE_MS) return;
  lastGroupTouch.set(f.id, Date.now());
  if (lastGroupTouch.size > 50_000) lastGroupTouch.clear();

  const tg = BigInt(f.id);
  const now = new Date();
  const p = profileOf(ctx);
  (async () => {
    await db.user.upsert({
      where: { telegramId: tg },
      update: { ...p, lastSeenAt: now },
      create: { telegramId: tg, ...p, role: 'USER', cityId, firstSeenVia: 'group', sourceGroupChatId: BigInt(chatId), lastSeenAt: now },
    });
    // Manba faqat bir marta — birinchi ko'ringan guruh
    await db.user.updateMany({ where: { telegramId: tg, sourceGroupChatId: null }, data: { sourceGroupChatId: BigInt(chatId) } });
  })().catch((err) => console.error('trackGroupUser:', err.message));
}

/**
 * /start belgisi: "g1001647665739" — shu guruhdagi reklama havolasidan kelgan.
 * Manba avval yozilmagan bo'lsagina o'rnatiladi (birinchi tegish qoidasi).
 */
export async function trackStart(ctx: Context, payload: string | undefined): Promise<void> {
  if (!ctx.from) return;
  const tg = BigInt(ctx.from.id);
  try {
    // Odam hali yozilmagan bo'lsa (middleware bilan poyga) — avval yaratamiz
    await db.user.upsert({ where: { telegramId: tg }, update: {}, create: { telegramId: tg, ...profileOf(ctx), role: 'USER', firstSeenVia: 'bot', lastSeenAt: new Date() } });
    await db.user.updateMany({ where: { telegramId: tg, startedBotAt: null }, data: { startedBotAt: new Date() } });
    if (payload) await db.user.updateMany({ where: { telegramId: tg, startParam: null }, data: { startParam: payload.slice(0, 64) } });
    const m = payload?.match(/^g(\d{5,20})$/);
    if (m) {
      const chatId = BigInt(`-${m[1]}`);
      await db.user.updateMany({ where: { telegramId: tg, sourceGroupChatId: null }, data: { sourceGroupChatId: chatId } });
    }
  } catch (err) {
    console.error('trackStart:', (err as Error).message);
  }
}

/** Shaxsiy chatda botni bloklash / qayta yoqish. */
export function trackBotBlock(userId: number, blocked: boolean): void {
  db.user
    .updateMany({ where: { telegramId: BigInt(userId) }, data: { botBlockedAt: blocked ? new Date() : null } })
    .catch((err) => console.error('trackBotBlock:', err.message));
}

/** Guruhga yuboriladigan bot havolasiga manba belgisini qo'shadi. */
export function withGroupSource(url: string, botUsername: string | undefined, chatId: number): string {
  if (!botUsername) return url;
  const re = new RegExp(`^https?://t\\.me/${botUsername}/?$`, 'i');
  return re.test(url.trim()) ? `https://t.me/${botUsername}?start=g${Math.abs(chatId)}` : url;
}

const suspendedCache = new Map<number, { v: boolean; exp: number }>();
/** Admin to'xtatgan foydalanuvchi — botdan foydalana olmaydi (5 daqiqa kesh). */
export async function isUserSuspended(userId: number): Promise<boolean> {
  const c = suspendedCache.get(userId);
  if (c && c.exp > Date.now()) return c.v;
  const u = await db.user.findUnique({ where: { telegramId: BigInt(userId) }, select: { isSuspended: true, role: true } }).catch(() => null);
  const v = !!u && u.role === 'USER' && u.isSuspended;
  suspendedCache.set(userId, { v, exp: Date.now() + 5 * 60_000 });
  return v;
}
