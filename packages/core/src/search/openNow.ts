/**
 * "Hozir ochiq" hisobi (2026-10, foydalanuvchi ilovasi). Server vaqti UTC
 * bo'lgani uchun soat har doim Toshkent (UTC+5, yozgi vaqt yo'q) bo'yicha
 * olinadi. Tungi ish vaqti (22:00–06:00) — yarim tundan o'tadigan oraliq
 * sifatida to'g'ri hisoblanadi.
 */
const TASHKENT_OFFSET_MIN = 5 * 60;

function parseHm(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = v.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

export type OpenState = { status: 'open' | 'closed' | 'unknown'; label: string };

export function getOpenState(workFrom: string | null | undefined, workTo: string | null | undefined, now: Date = new Date()): OpenState {
  const from = parseHm(workFrom);
  const to = parseHm(workTo);
  if (from === null || to === null) return { status: 'unknown', label: '' };
  if (from === to || (from === 0 && to >= 24 * 60 - 1)) return { status: 'open', label: '24/7' };

  const local = (now.getUTCHours() * 60 + now.getUTCMinutes() + TASHKENT_OFFSET_MIN) % (24 * 60);
  const isOpen = from < to ? local >= from && local < to : local >= from || local < to;
  return isOpen
    ? { status: 'open', label: `Ochiq · ${workTo} gacha` }
    : { status: 'closed', label: `Yopiq · ${workFrom} da ochiladi` };
}

// Izohlardagi so'kinish/haqorat (o'zbek + rus o'zaklari). To'liq ro'yxat
// emas — admin ko'rib chiqishi baribir saqlanadi, bu birinchi filtr.
const PROFANITY_STEMS = ['jalab', 'qanjiq', 'itvachcha', 'skotina', 'suka', 'blya', 'xuy', 'хуй', 'бля', 'сука', 'пизд', 'ебан', 'eban', 'pizd', 'mudak', 'мудак', 'dalbayob', 'долбоеб', 'gandon', 'гандон'];

export function containsProfanity(text: string): boolean {
  const t = text.toLowerCase();
  return PROFANITY_STEMS.some((s) => t.includes(s));
}
