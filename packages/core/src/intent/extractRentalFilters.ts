import { normalizeText } from '../transliteration';

/**
 * Xabar matnidan ko'chmas mulk arenda so'rovi uchun STRUKTURAVIY
 * filtrlarni (xonalar soni, max narx+valyuta, muddat turi) mahalliy
 * regex orqali ajratib oladi — `extractRequestedBadges.ts` bilan bir xil
 * uslub: AI (Gemini) chaqirilmaydi, tezkor va bepul, natija deterministik.
 *
 * `searchEngine.ts`da bu QATTIQ FILTR sifatida ishlatiladi (badge'lardan
 * farqli, ular faqat reyting bonusi) — chunki foydalanuvchi "2 xonali"
 * yoki "300 dollargacha" deganda bu ANIQ, kelishilmaydigan talab, "menda
 * shunday bor" degan yumshoq afzallik emas.
 */
export interface RentalFilters {
  /** Aniq xonalar soni ("2 xonali" -> 2), yoki `null` agar so'ralmagan bo'lsa. */
  roomCount: number | null;
  /** true bo'lsa, roomCount "kamida shuncha" (masalan "4 xonadan ko'p/katta", "4+"). */
  roomCountIsMinimum: boolean;
  /** Max narx chegarasi ("300 dollargacha" -> 300), yoki `null`. */
  maxPrice: number | null;
  currency: 'UZS' | 'USD' | null;
  termType: 'KUNLIK' | 'OYLIK' | 'YILLIK' | null;
}

const EMPTY_FILTERS: RentalFilters = {
  roomCount: null,
  roomCountIsMinimum: false,
  maxPrice: null,
  currency: null,
  termType: null,
};

function extractRoomCount(n: string): { roomCount: number | null; roomCountIsMinimum: boolean } {
  // "4 xonadan ko'p/katta/ortiq" yoki "4+" — pastki chegara, aniq son emas.
  const minMatch = n.match(/\b(\d{1,2})\s*\+|\b(\d{1,2})\s*xona\w*\s*(dan)?\s*(ko'?p|katta|ortiq)\b/);
  if (minMatch) {
    const num = parseInt(minMatch[1] || minMatch[2], 10);
    if (num >= 1 && num <= 20) return { roomCount: num, roomCountIsMinimum: true };
  }
  // Oddiy aniq son: "2 xonali", "3-xonali", "2 xona"
  const exactMatch = n.match(/\b(\d{1,2})[\s-]?xona\w*\b/);
  if (exactMatch) {
    const num = parseInt(exactMatch[1], 10);
    if (num >= 1 && num <= 20) return { roomCount: num, roomCountIsMinimum: false };
  }
  return { roomCount: null, roomCountIsMinimum: false };
}

function extractPrice(n: string): { maxPrice: number | null; currency: 'UZS' | 'USD' | null } {
  // "300 dollargacha", "500 ming so'mgacha", "$300 gacha" kabi — faqat
  // "...gacha"/"oshmasin"/"dan kam" bilan birga kelganda MAX CHEGARA deb
  // hisoblanadi (aks holda oddiy narx aytilishi ham "chegara" deb noto'g'ri
  // talqin qilinishi mumkin edi).
  const priceRe =
    /(\d[\d\s]*)\s*(ming|mln|million)?\s*(so'?m|dollar|\$|у\.е\.?)\s*(gacha|dan\s*kam|dan\s*oshmasin|oshmasligi)/;
  const match = n.match(priceRe);
  if (!match) return { maxPrice: null, currency: null };

  let amount = parseInt(match[1].replace(/\s+/g, ''), 10);
  if (isNaN(amount)) return { maxPrice: null, currency: null };
  if (match[2] === 'ming') amount *= 1000;
  else if (match[2] === 'mln' || match[2] === 'million') amount *= 1_000_000;

  const currency: 'UZS' | 'USD' = /dollar|\$|у\.е/.test(match[3]) ? 'USD' : 'UZS';
  return { maxPrice: amount, currency };
}

function extractTermType(n: string): 'KUNLIK' | 'OYLIK' | 'YILLIK' | null {
  if (/\bkunlik\b|\bsutkalik\b|\bposutochno\w*\b/.test(n)) return 'KUNLIK';
  if (/\boylik\b/.test(n)) return 'OYLIK';
  if (/\byillik\b/.test(n)) return 'YILLIK';
  return null;
}

export function extractRentalFilters(rawMessage: string): RentalFilters {
  const n = normalizeText(rawMessage);
  if (!n) return EMPTY_FILTERS;

  const { roomCount, roomCountIsMinimum } = extractRoomCount(n);
  const { maxPrice, currency } = extractPrice(n);
  const termType = extractTermType(n);

  if (roomCount === null && maxPrice === null && termType === null) return EMPTY_FILTERS;

  return { roomCount, roomCountIsMinimum, maxPrice, currency, termType };
}
