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
 *
 * 2026-09: "guruh-hujumi" (checkAndRecordGroupFlood) qo'shildi — bir
 * necha TURLI akkaunt (masalan bot-akkauntlar) qisqa vaqt ichida bir xil
 * xabarni yozsa, bu klassik "raid" hujumi belgisi. Yuqoridagi ikkita
 * mexanizm faqat BITTA foydalanuvchining o'zini kuzatadi — bu esa butun
 * GURUH bo'ylab, chatId+matn "yadrosi" bo'yicha kuzatadi.
 */

import { redisConnection } from '../queue/deleteQueue';

const RATE_KEY_PREFIX = 'kimbor:flood:rate:'; // umumiy tezlik chegarasi uchun
const DUP_KEY_PREFIX = 'kimbor:flood:dup:'; // bir xil xabar takrorlanishi uchun
const GROUP_KEY_PREFIX = 'kimbor:flood:group:'; // ko'p-akkauntli hujum uchun

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

// Bir xil matnni 10 soniya ichida kamida 3 ta TURLI odam yozsa — klassik
// ko'p-akkauntli ("raid") spam-hujum belgisi. Juda qisqa/umumiy matnlar
// (masalan "ha", "ок") tasodifan mos kelib qolmasligi uchun eng kamida
// 8 belgili "yadro" talab qilinadi (bitta foydalanuvchi ichidagi
// takrorlanish tekshiruvidan (4 belgi) qattiqroq — bu yerda tasodifiy
// mos kelish xavfi kattaroq, chunki turli odamlar tekshiriladi).
const GROUP_FLOOD_WINDOW_MS = 10_000;
const GROUP_FLOOD_MIN_DISTINCT_USERS = 3;
const GROUP_FLOOD_MIN_CORE_LENGTH = 8;

function groupFloodKey(chatId: number, textCore: string): string {
  return `${GROUP_KEY_PREFIX}${chatId}:${textCore}`;
}

/**
 * Guruh bo'ylab (bitta foydalanuvchi emas) bir xil xabar necha TURLI
 * odam tomonidan yozilganini kuzatadi. Chegaraga yetsa — shu "portlash"
 * ichidagi HAMMA xabarlarning (chatId, messageId) ro'yxatini qaytaradi,
 * shunda chaqiruvchi tomon nafaqat oxirgi xabarni, balki BUTUN hujumni
 * tozalab tashlashi mumkin.
 */
export async function checkAndRecordGroupFlood(
  chatId: number,
  userId: number,
  messageId: number,
  normalizedText: string
): Promise<{ isGroupFlood: boolean; burstMessageIds: number[] }> {
  try {
    const textCore = normalizedText.replace(/\s+/g, '').slice(0, 100);
    if (textCore.length < GROUP_FLOOD_MIN_CORE_LENGTH) {
      return { isGroupFlood: false, burstMessageIds: [] };
    }

    const key = groupFloodKey(chatId, textCore);
    const now = Date.now();
    await redisConnection.zadd(key, now, JSON.stringify({ userId, messageId, ts: now }));
    await redisConnection.zremrangebyscore(key, 0, now - GROUP_FLOOD_WINDOW_MS);
    await redisConnection.expire(key, 30);

    const rawEntries = await redisConnection.zrange(key, 0, -1);
    const entries = rawEntries.map((e) => JSON.parse(e) as { userId: number; messageId: number; ts: number });
    const distinctUsers = new Set(entries.map((e) => e.userId));

    if (distinctUsers.size >= GROUP_FLOOD_MIN_DISTINCT_USERS) {
      // Butun "portlash"ni tozalaymiz — key'ni o'chiramiz, shu bilan
      // keyingi tekshiruv yangidan (0 dan) boshlanadi.
      await redisConnection.del(key);
      return { isGroupFlood: true, burstMessageIds: entries.map((e) => e.messageId) };
    }

    return { isGroupFlood: false, burstMessageIds: [] };
  } catch (err) {
    console.error('Guruh-flood tracker xatosi (jim o\'tkazib yuborildi):', err);
    return { isGroupFlood: false, burstMessageIds: [] };
  }
}
