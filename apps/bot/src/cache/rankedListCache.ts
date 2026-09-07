/**
 * rankedListCache.ts
 *
 * "Yana ko'rish" tugmasi bosilganda 2-7 o'rinlarni BITTADAN, HAR BIRINI
 * O'ZINING alohida, to'liq postida (kerak bo'lsa rasmlari bilan)
 * ko'rsatish uchun holatni saqlaydi. Avval mavjud xabarga matn qo'shib
 * qo'yish (edit) usuli ishlatilgan edi, lekin bu rasmli yozuvlar uchun
 * matn/rasmlarni aralashtirib yuborardi (2026-09 tuzatildi) — endi har
 * bosilganda YANGI, mustaqil xabar yuboriladi.
 *
 * Redis'da (BullMQ bilan bir xil ulanish) saqlanadi, shuning uchun bot
 * qayta ishga tushsa ham (deploy paytida) tugma ishlayveradi. Muddati
 * xabar o'chirilish vaqti bilan bir xil (15 daqiqa).
 */

import { redisConnection } from '../queue/deleteQueue';

const KEY_PREFIX = 'kimbor:rankedlist:';
const TTL_SECONDS = 15 * 60;

export interface RankedListItem {
  formattedText: string;
  photoUrls: string[];
}

export interface RankedListState {
  /** 2-7 o'rinlar — har biri "Yana ko'rish" bosilganda navbat bilan
   * O'ZINING alohida postida yuboriladi. */
  items: RankedListItem[];
  /** items'dan nechtasi hozircha alohida post qilib yuborilgan. */
  revealed: number;
}

export async function setRankedList(listingId: string, items: RankedListItem[]): Promise<void> {
  try {
    const state: RankedListState = { items, revealed: 0 };
    await redisConnection.set(`${KEY_PREFIX}${listingId}`, JSON.stringify(state), 'EX', TTL_SECONDS);
  } catch (err) {
    console.error('Failed to cache ranked list:', err);
  }
}

/**
 * Keyingi bitta natijani "ochadi" (revealed +1) va OCHILGAN o'sha bitta
 * elementni (keyingi alohida post sifatida yuborish uchun) qaytaradi.
 * Holat topilmasa (muddati o'tgan) yoki hammasi allaqachon ko'rsatilgan
 * bo'lsa — null.
 */
export async function revealNextRankedItem(
  listingId: string
): Promise<{ item: RankedListItem; remaining: number } | null> {
  try {
    const raw = await redisConnection.get(`${KEY_PREFIX}${listingId}`);
    if (!raw) return null;
    const state: RankedListState = JSON.parse(raw);
    if (state.revealed >= state.items.length) return null;
    const item = state.items[state.revealed];
    state.revealed += 1;
    await redisConnection.set(`${KEY_PREFIX}${listingId}`, JSON.stringify(state), 'EX', TTL_SECONDS);
    return { item, remaining: state.items.length - state.revealed };
  } catch (err) {
    console.error('Failed to update ranked list reveal state:', err);
    return null;
  }
}
