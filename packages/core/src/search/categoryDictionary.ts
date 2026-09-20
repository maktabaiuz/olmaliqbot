import { db } from '@kimbor/db';
import { normalizeText } from '../transliteration';
import { UZBEK_STOPWORDS } from './uzbekStopwords';

/**
 * Adminlar ba'zan butun bir E'LON MATNINI yoki ma'nosiz so'zni (masalan
 * "test", "Ish", "Касб") kategoriya nomi maydoniga joylashtirib yuboradi.
 * Bunday "kategoriya" qidiruv aniqligini buzadi (qarang: searchEngine.ts
 * dagi batafsil izoh) va endi AI klassifikator uchun ham "haqiqiy
 * kategoriya" deb ko'rsatilmasligi kerak (qarang: aiClassifier.ts).
 *
 * MUHIM (2026-09): bu funksiya avval faqat "uzun/g'alati" nomlarni
 * (reklama matni, telefon raqami) ushlar edi. Endi UZBEK_STOPWORDS
 * lug'atidan foydalanib, "test"/"Ish" kabi QISQA, lekin ma'nosiz
 * (butunlay umumiy so'zlardan iborat) nomlarni ham avtomatik aniqlaydi —
 * kelajakda shunga o'xshash axlat kiritilsa ham, qo'lda ro'yxatga
 * qo'shishni kutmasdan ushlanadi.
 */
export function isMalformedCategoryName(name: string): boolean {
  if (/[\n\r]/.test(name)) return true;
  if (name.length > 40) return true;
  if (/\+998|\d{3}[-\s]\d{2}[-\s]\d{2}|@\w+/.test(name)) return true;
  const words = normalizeText(name)
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 0 && words.every((w) => UZBEK_STOPWORDS.has(w))) return true;
  return false;
}

// MUHIM (2026-09, "professional audit"dan keyingi tub yechim): AI
// klassifikatorning (Gemini) "category" maydoni avval ERKIN MATN edi —
// AI istalgan narsa yoza olardi, shu sabab "perekrutel", "razval",
// "klapan", "karbyuratorchi", "ustoz" kabi bizda UMUMAN YO'Q, o'ylab
// topilgan kategoriya nomlari muntazam chiqib turardi. Bularning har biri
// alohida aniqlanib, qidiruv qatlamida (searchEngine.ts) chetlab
// o'tilishi kerak edi — bu CHEKSIZ davom etadigan, faqat REAKTIV
// yondashuv edi.
//
// TUB YECHIM: AI'ga yuboriladigan so'rov sxemasida "category" endi ENUM
// (faqat bizning HAQIQIY, bazada mavjud kategoriyalar ro'yxatidan biri)
// bilan cheklanadi — xuddi "intent"/"object_type" uchun allaqachon
// qilingani kabi. Shu orqali AI YO'Q kategoriya o'ylab topa OLMAYDI —
// faqat haqiqiy ro'yxatdan tanlaydi, yoki mos kelmasa "NONE" qaytaradi.
const CATEGORY_ENUM_TTL_MS = 10 * 60 * 1000;
let categoryEnumCache: { names: string[]; expiresAt: number } | null = null;

/**
 * Bazadagi barcha HAQIQIY (axlat bo'lmagan) kategoriya nomlarini,
 * AI klassifikator promptidagi bilan bir xil formatda (kichik harf,
 * o'zbek lotin) qaytaradi — Gemini so'rov sxemasidagi "category" enum
 * ro'yxati sifatida ishlatish uchun. 10 daqiqaga keshlanadi (bot har
 * xabar uchun bazani qayta so'ramasin).
 */
export async function getRealCategoryEnumNames(): Promise<string[]> {
  if (categoryEnumCache && categoryEnumCache.expiresAt > Date.now()) {
    return categoryEnumCache.names;
  }
  const cats = await db.category.findMany({ select: { name: true } });
  const names = Array.from(
    new Set(
      cats
        .filter((c) => !isMalformedCategoryName(c.name))
        .map((c) => normalizeText(c.name))
        .filter(Boolean)
    )
  ).sort();
  categoryEnumCache = { names, expiresAt: Date.now() + CATEGORY_ENUM_TTL_MS };
  return names;
}
