import { db } from '@kimbor/db';

/**
 * Ilova (Mini App) va @uz11_bot foydalanuvchilarini ham User jadvaliga yozadi
 * (2026-10-08) — avval ular umuman saqlanmasdi, "Userlar"da ko'rinmasdi.
 * Faqat Telegram ID va profil; 30 daqiqada bir martadan ko'p emas.
 */
const lastTouch = new Map<string, number>();

export function trackApiUser(
  telegramId: bigint,
  from: { first_name?: string; last_name?: string; username?: string; language_code?: string; is_premium?: boolean } | null | undefined,
  via: 'app' | 'uz11',
  cityId?: string | null
): void {
  const k = telegramId.toString();
  if (Date.now() - (lastTouch.get(k) || 0) < 30 * 60_000) return;
  lastTouch.set(k, Date.now());
  if (lastTouch.size > 50_000) lastTouch.clear();
  const p = {
    ...(from?.first_name !== undefined ? { firstName: from.first_name || null } : {}),
    ...(from?.last_name !== undefined ? { lastName: from.last_name || null } : {}),
    ...(from?.username !== undefined ? { username: from.username || null } : {}),
    ...(from?.language_code ? { languageCode: from.language_code } : {}),
    ...(from?.is_premium !== undefined ? { isPremium: !!from.is_premium } : {}),
  };
  const now = new Date();
  db.user
    .upsert({
      where: { telegramId },
      update: { ...p, lastSeenAt: now },
      create: { telegramId, ...p, role: 'USER', firstSeenVia: via, lastSeenAt: now, ...(cityId ? { cityId } : {}) },
    })
    .catch((err) => console.error('trackApiUser:', err.message));
}
