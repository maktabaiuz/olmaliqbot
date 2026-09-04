/**
 * rankedListCache.ts
 *
 * "Yana ko'rish" tugmasi bosilganda 2-7 o'rinlarni BITTADAN qo'shib
 * ko'rsatish uchun holatni saqlaydi (1-o'rin allaqachon asosiy javobda bor).
 * Redis'da (BullMQ bilan bir xil ulanish) saqlanadi, shuning uchun bot
 * qayta ishga tushsa ham (deploy paytida) tugma ishlayveradi. Muddati
 * xabar o'chirilish vaqti bilan bir xil (15 daqiqa).
 */

import { redisConnection } from '../queue/deleteQueue';

const KEY_PREFIX = 'kimbor:rankedlist:';
const TTL_SECONDS = 15 * 60;

export interface RankedListState {
  /** Asosiy javobning to'liq matni (1-o'rin) — har bir "Yana ko'rish" bosilganda shu asosga qo'shiladi. */
  headerCard: string;
  /** 2-7 o'rinlar uchun oldindan formatlangan qatorlar. */
  compactLines: string[];
  /** compactLines'dan nechtasi hozircha ko'rsatilgan. */
  revealed: number;
}

export async function setRankedList(listingId: string, headerCard: string, compactLines: string[]): Promise<void> {
  try {
    const state: RankedListState = { headerCard, compactLines, revealed: 0 };
    await redisConnection.set(`${KEY_PREFIX}${listingId}`, JSON.stringify(state), 'EX', TTL_SECONDS);
  } catch (err) {
    console.error('Failed to cache ranked list:', err);
  }
}

/**
 * Keyingi bitta natijani "ochadi" (revealed +1) va yangilangan holatni
 * qaytaradi. Holat topilmasa (muddati o'tgan) — null.
 */
export async function revealNextRankedItem(listingId: string): Promise<RankedListState | null> {
  try {
    const raw = await redisConnection.get(`${KEY_PREFIX}${listingId}`);
    if (!raw) return null;
    const state: RankedListState = JSON.parse(raw);
    if (state.revealed < state.compactLines.length) {
      state.revealed += 1;
    }
    await redisConnection.set(`${KEY_PREFIX}${listingId}`, JSON.stringify(state), 'EX', TTL_SECONDS);
    return state;
  } catch (err) {
    console.error('Failed to update ranked list reveal state:', err);
    return null;
  }
}
