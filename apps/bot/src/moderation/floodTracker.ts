/**
 * floodTracker.ts
 *
 * Bir foydalanuvchining bitta guruhda qisqa vaqt ichida nechta xabar
 * yozganini Redis'da kuzatib boradi ("flud"/spam-bombardimon aniqlash
 * uchun). Bot qayta ishga tushsa ham (deploy paytida) holat yo'qolib
 * ketmasligi uchun Redis'dan foydalaniladi — xuddi deleteQueue.ts va
 * rankedListCache.ts'dagi kabi bir xil ulanish qayta ishlatiladi.
 *
 * MUHIM: bu tracker faqat "shubhali" xabarlar (haqiqiy xizmat so'rovi
 * BO'LMAGAN) uchun ishlatilishi kerak — chaqiruvchi tomon (moderation
 * enforcement) buni hal qiladi, bu yerda faqat hisoblash mantiqi bor.
 */

import { redisConnection } from '../queue/deleteQueue';

const RATE_KEY_PREFIX = 'kimbor:flood:rate:'; // umumiy tezlik chegarasi uchun
const DUP_KEY_PREFIX = 'kimbor:flood:dup:'; // bir xil xabar takrorlanishi uchun

// Xavfsizlik-to'ri: mazmunidan qat'iy nazar, 10 soniyada 15 tadan ortiq
// xabar — bu odam emas, avtomatlashtirilgan hujum/bot belgisi.
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_MESSAGES = 15;

// Bir xil (yoki deyarli bir xil) xabar 10 soniya ichida 3 marta
// takrorlansa — klassik nusxa-joylash spami (masalan reklama matnini
// ketma-ket yopishtirish).
const DUP_WINDOW_MS = 10_000;
const DUP_MAX_REPEATS = 3;

function rateKey(chatId: number, userId: number): string {
  return `${RATE_KEY_PREFIX}${chatId}:${userId}`;
}
function dupKey(chatId: number, userId: number, textCore: string): string {
  return `${DUP_KEY_PREFIX}${chatId}:${userId}:${textCore}`;
}

/**
 * Har bir xabarda chaqiriladi. Ikkala mexanizmni ham yangilaydi va
 * chegaradan oshgan-oshmaganini qaytaradi.
 */
export async function checkAndRecordFlood(
  chatId: number,
  userId: number,
  normalizedText: string
): Promise<{ isFlood: boolean; reason: 'rate' | 'duplicate' | null }> {
  try {
    const now = Date.now();

    // 1) Umumiy tezlik chegarasi (sorted set — har bir xabar vaqti alohida a'zo)
    const rKey = rateKey(chatId, userId);
    await redisConnection.zadd(rKey, now, `${now}:${Math.random()}`);
    await redisConnection.zremrangebyscore(rKey, 0, now - RATE_WINDOW_MS);
    const rateCount = await redisConnection.zcard(rKey);
    await redisConnection.expire(rKey, 30);
    if (rateCount > RATE_MAX_MESSAGES) {
      return { isFlood: true, reason: 'rate' };
    }

    // 2) Bir xil xabar takrorlanishi (oddiy counter, "yadro" matn bo'yicha)
    const textCore = normalizedText.replace(/\s+/g, '').slice(0, 100);
    if (textCore.length >= 4) {
      const dKey = dupKey(chatId, userId, textCore);
      const dupCount = await redisConnection.incr(dKey);
      await redisConnection.expire(dKey, Math.ceil(DUP_WINDOW_MS / 1000));
      if (dupCount >= DUP_MAX_REPEATS) {
        return { isFlood: true, reason: 'duplicate' };
      }
    }

    return { isFlood: false, reason: null };
  } catch (err) {
    console.error('Flood tracker xatosi (jim o\'tkazib yuborildi):', err);
    return { isFlood: false, reason: null };
  }
}
