/**
 * rankedListCache.ts
 *
 * "Yana ko'rish" tugmasi bosilganda 2-7 o'rinlarni bittadan ko'rsatish
 * uchun holatni saqlaydi.
 *
 * MUHIM (2026-09, ikkinchi marta tuzatildi): avval mavjud xabarni
 * TAHRIRLASH (edit) usuli ishlatilgan, keyin bu rasmli yozuvlar uchun
 * matn/rasmlarni aralashtirib yuborgani sabab har doim YANGI, mustaqil
 * xabar yuborishga o'zgartirilgan edi — lekin bu guruhda "Yana" bir necha
 * marta bosilsa, bir xil savolga o'nlab alohida post to'planib qolishiga
 * olib keldi (real skrinshot bilan tasdiqlangan shikoyat). Endi ikkalasi
 * ham to'g'ri: RASMLI (Rich Message) yozuvlar hamon o'zining alohida
 * postida yuboriladi (matn/rasm aralashmasligi uchun), lekin ikkala
 * tomon ham (hozir ekranda turgan xabar HAM, keyingi ko'rsatiladigan
 * yozuv HAM) MATN-ONLY bo'lsa — yangi post yuborish o'rniga MAVJUD
 * xabarning o'zi tahrirlanadi, shunda chat bitta post ichida "aylanadi",
 * ortiqcha ko'payib ketmaydi.
 *
 * Buning uchun holatga `lastHadPhoto` qo'shildi — ekranda HOZIR turgan
 * xabar rasmli (Rich Message) yoki oddiy matnligini kuzatadi.
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
  /** Bo'lsa — "📍 Lokatsiya" (yashil) tugmasi shu yozuv uchun ham qo'shiladi. */
  mapUrl: string | null;
}

export interface RankedListState {
  /** 2-7 o'rinlar — "Yana ko'rish" bosilganda navbat bilan ko'rsatiladi. */
  items: RankedListItem[];
  /** items'dan nechtasi hozircha ko'rsatilgan. */
  revealed: number;
  /** Ekranda HOZIR turgan xabar rasmli (Rich Message) bo'lsa true —
   * shunda keyingi bosishda tahrirlab bo'lmaydi, yangi post kerak. */
  lastHadPhoto: boolean;
}

export async function setRankedList(
  listingId: string,
  items: RankedListItem[],
  firstResultHadPhoto: boolean
): Promise<void> {
  try {
    const state: RankedListState = { items, revealed: 0, lastHadPhoto: firstResultHadPhoto };
    await redisConnection.set(`${KEY_PREFIX}${listingId}`, JSON.stringify(state), 'EX', TTL_SECONDS);
  } catch (err) {
    console.error('Failed to cache ranked list:', err);
  }
}

/**
 * Keyingi bitta natijani "ochadi" (revealed +1) va qaytaradi. `canEdit`
 * — ekranda hozir turgan xabar HAM, keyingi yozuv HAM matn-only bo'lsa
 * true (shu holatda chaqiruvchi yangi post o'rniga mavjud xabarni
 * tahrirlashi kerak). Holat topilmasa (muddati o'tgan) yoki hammasi
 * allaqachon ko'rsatilgan bo'lsa — null.
 */
export async function revealNextRankedItem(
  listingId: string
): Promise<{ item: RankedListItem; remaining: number; canEdit: boolean } | null> {
  try {
    const raw = await redisConnection.get(`${KEY_PREFIX}${listingId}`);
    if (!raw) return null;
    const state: RankedListState = JSON.parse(raw);
    if (state.revealed >= state.items.length) return null;
    const item = state.items[state.revealed];
    const currentHadPhoto = state.lastHadPhoto;
    const nextHasPhoto = !!(item.photoUrls && item.photoUrls.length > 0);
    state.revealed += 1;
    state.lastHadPhoto = nextHasPhoto;
    await redisConnection.set(`${KEY_PREFIX}${listingId}`, JSON.stringify(state), 'EX', TTL_SECONDS);
    return { item, remaining: state.items.length - state.revealed, canEdit: !currentHadPhoto && !nextHasPhoto };
  } catch (err) {
    console.error('Failed to update ranked list reveal state:', err);
    return null;
  }
}
