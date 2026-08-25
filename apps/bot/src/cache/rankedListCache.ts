/**
 * rankedListCache.ts
 *
 * "Yana ko'rish" tugmasi bosilganda ko'rsatiladigan 1-7 ranked ro'yxatni
 * vaqtincha saqlaydi. Redis'da (BullMQ bilan bir xil ulanish) saqlanadi,
 * shuning uchun bot qayta ishga tushsa ham (deploy paytida) tugma ishlayveradi.
 * Muddati xabar o'chirilish vaqti bilan bir xil (15 daqiqa).
 */

import { redisConnection } from '../queue/deleteQueue';

const KEY_PREFIX = 'kimbor:rankedlist:';
const TTL_SECONDS = 15 * 60;

export async function setRankedList(listingId: string, text: string): Promise<void> {
  try {
    await redisConnection.set(`${KEY_PREFIX}${listingId}`, text, 'EX', TTL_SECONDS);
  } catch (err) {
    console.error('Failed to cache ranked list:', err);
  }
}

export async function getRankedList(listingId: string): Promise<string | null> {
  try {
    return await redisConnection.get(`${KEY_PREFIX}${listingId}`);
  } catch (err) {
    console.error('Failed to read cached ranked list:', err);
    return null;
  }
}
