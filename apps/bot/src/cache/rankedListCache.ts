/**
 * rankedListCache.ts
 *
 * "Yana ko'rish" tugmasi uchun holat (2026-10-08 qayta yozildi).
 *
 * Tartib: "Yana" bosilganda YANGI post yuborilmaydi — o'sha postning o'zi
 * tahrirlanib, avvalgi ma'lumotlar o'z joyida qoladi va ularning OSTIGA
 * navbatdagi yozuv qo'shiladi (bir post ichida 1, 2, 3... yozuv). Rasmli
 * yozuvlar ham shunday — Telegram rich xabarni tahrirlashga ruxsat beradi.
 *
 * Holat endi POST bo'yicha saqlanadi (chatId:messageId). Avval birinchi
 * yozuvning ID'si kalit edi — ikki guruhda bir vaqtda bir xil savol
 * berilsa, ikkala post bitta navbatni bo'lishib, bir-birining yozuvlarini
 * "yeb" qo'yardi.
 *
 * Redis'da, 15 daqiqa (guruh xabari o'chish muddati bilan bir xil).
 */

import { redisConnection } from '../queue/deleteQueue';

const KEY_PREFIX = 'kimbor:rankedlist:v2:';
const TTL_SECONDS = 15 * 60;

export interface RankedListItem {
  formattedText: string;
  photoUrls: string[];
  /** Bo'lsa — "📍 Lokatsiya" tugmasi shu yozuv uchun ham qo'shiladi. */
  mapUrl: string | null;
}

interface RankedListState {
  /** Postda hozir ko'rinib turgan yozuvlar (birinchisi — asosiy javob). */
  shown: RankedListItem[];
  /** Hali ko'rsatilmagan navbat. */
  queue: RankedListItem[];
}

const key = (chatId: number, messageId: number) => `${KEY_PREFIX}${chatId}:${messageId}`;

export async function setRankedList(chatId: number, messageId: number, first: RankedListItem, rest: RankedListItem[]): Promise<void> {
  try {
    const state: RankedListState = { shown: [first], queue: rest };
    await redisConnection.set(key(chatId, messageId), JSON.stringify(state), 'EX', TTL_SECONDS);
  } catch (err) {
    console.error('Failed to cache ranked list:', err);
  }
}

/**
 * Navbatdagi bitta yozuvni postga qo'shadi va postda endi ko'rinishi kerak
 * bo'lgan BARCHA yozuvlarni qaytaradi. Holat topilmasa (muddati o'tgan)
 * yoki navbat tugagan bo'lsa — null.
 */
export async function revealNextRankedItem(
  chatId: number,
  messageId: number
): Promise<{ shown: RankedListItem[]; remaining: number } | 'expired' | 'empty'> {
  try {
    const raw = await redisConnection.get(key(chatId, messageId));
    if (!raw) return 'expired';
    const state: RankedListState = JSON.parse(raw);
    const next = state.queue.shift();
    if (!next) return 'empty';
    state.shown.push(next);
    await redisConnection.set(key(chatId, messageId), JSON.stringify(state), 'EX', TTL_SECONDS);
    return { shown: state.shown, remaining: state.queue.length };
  } catch (err) {
    console.error('Failed to update ranked list reveal state:', err);
    return 'expired';
  }
}

/** Zaxira holatda (yangi post yuborilganda) navbat yangi postga ko'chadi. */
export async function moveRankedList(chatId: number, fromMessageId: number, toMessageId: number): Promise<void> {
  try {
    const raw = await redisConnection.get(key(chatId, fromMessageId));
    if (!raw) return;
    const state: RankedListState = JSON.parse(raw);
    state.shown = state.shown.slice(-1);
    await redisConnection.set(key(chatId, toMessageId), JSON.stringify(state), 'EX', TTL_SECONDS);
    await redisConnection.del(key(chatId, fromMessageId));
  } catch (err) {
    console.error('Failed to move ranked list:', err);
  }
}
