import initialDictionaryData from './initialDictionary.json';
import { normalizeText, levenshteinDistance } from '../transliteration';

export interface CategorySeed {
  id: string;
  name: string;
  synonyms: string[];
  object_type: string;
}

export interface LandmarkSeed {
  official_name: string;
  folk_names: string[];
}

export const INITIAL_DICTIONARY = initialDictionaryData;

/**
 * Strips Uzbek/Russian positional suffixes from landmark phrases
 * (e.g. "karzinka oldi" -> "karzinka", "корзинка возле" -> "корзинка")
 */
export function stripLandmarkSuffixes(text: string): string {
  if (!text) return '';
  let cleaned = text.trim().toLowerCase();

  for (const suffix of initialDictionaryData.suffixes) {
    const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s+)${escaped}(?:$|\\s+)`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  }

  return cleaned.trim();
}

/**
 * Normalizes numbered district patterns
 * (e.g. "3-mavze", "3 mavze", "uchinchi mavze" -> "3-mavze")
 */
export function normalizeDistrictLandmark(text: string): string {
  const lower = text.toLowerCase().trim();

  if (/(3\s*-?\s*mavze|uchinchi\s*mavze|третий\s*микрорайон)/i.test(lower)) {
    return '3-mavze';
  }

  return lower;
}

// Lazily-built normalized lookup: har bir nom/sinonim -> lug'atdagi kanonik nom.
// Masalan "taxi" ham, "такси" ham -> "Taksi" ga ishora qiladi.
let canonicalCategoryLookup: Map<string, string> | null = null;

function getCanonicalCategoryLookup(): Map<string, string> {
  if (canonicalCategoryLookup) return canonicalCategoryLookup;

  const lookup = new Map<string, string>();
  for (const cat of initialDictionaryData.categories as CategorySeed[]) {
    lookup.set(normalizeText(cat.name), cat.name);
    for (const syn of cat.synonyms) {
      lookup.set(normalizeText(syn), cat.name);
    }
  }
  canonicalCategoryLookup = lookup;
  return lookup;
}

/**
 * Foydalanuvchi/AI kiritgan kategoriya nomini lug'atdagi KANONIK nomga
 * moslashtiradi (masalan "taxi", "Taxi", "такси" -> "Taksi"). Shu orqali
 * yozuv qo'shishda yozilish farqi sabab bazada dublikat kategoriya
 * ("Taxi" va "Taksi" alohida-alohida) yaralishining oldini oladi.
 * Lug'atda mos kelmasa — o'zgarishsiz qaytariladi (haqiqiy yangi kategoriya).
 */
export function resolveCanonicalCategoryName(inputName: string): string {
  if (!inputName) return inputName;
  const normalized = normalizeText(inputName);
  const lookup = getCanonicalCategoryLookup();
  const exact = lookup.get(normalized);
  if (exact) return exact;

  // Aniq moslik topilmasa — yozilish xatosiga chidamli qidiruv (masalan
  // "Choyxon" -> "Choyxona"). Shu orqali kichik xato tufayli lug'atda
  // allaqachon bor kategoriyaning dublikati yaralishining oldi olinadi.
  const compact = normalized.replace(/[\s'-]+/g, '');
  if (compact.length < 4) return inputName;

  const patterns = getSortedCategoryPatterns();
  let best: { canonicalName: string; distance: number } | null = null;
  for (const p of patterns) {
    const patternCompact = p.pattern.replace(/[\s'-]+/g, '');
    if (patternCompact.length < 4 || Math.abs(patternCompact.length - compact.length) > 3) continue;
    const dist = levenshteinDistance(compact, patternCompact);
    const threshold = Math.max(1, Math.floor(patternCompact.length / 6));
    if (dist <= threshold && (!best || dist < best.distance)) {
      best = { canonicalName: p.canonicalName, distance: dist };
    }
  }
  return best ? best.canonicalName : inputName;
}

export interface CategoryTextMatch {
  canonicalName: string;
  objectType: string;
}

// Uzun (aniqroq) sinonimlar avval tekshirilishi uchun uzunlik bo'yicha kamayish
// tartibida saralangan ro'yxat — masalan "kafel yotqizadigan" "kafel"dan oldin tekshiriladi.
let sortedCategoryPatterns: { pattern: string; canonicalName: string; objectType: string }[] | null = null;

function getSortedCategoryPatterns() {
  if (sortedCategoryPatterns) return sortedCategoryPatterns;

  const patterns: { pattern: string; canonicalName: string; objectType: string }[] = [];
  for (const cat of initialDictionaryData.categories as CategorySeed[]) {
    patterns.push({ pattern: normalizeText(cat.name), canonicalName: cat.name, objectType: cat.object_type });
    for (const syn of cat.synonyms) {
      patterns.push({ pattern: normalizeText(syn), canonicalName: cat.name, objectType: cat.object_type });
    }
  }
  patterns.sort((a, b) => b.pattern.length - a.pattern.length);
  sortedCategoryPatterns = patterns;
  return patterns;
}

/**
 * Xabar matni ichidan lug'atdagi (76+ kasb/soha) tanish kategoriya nomini
 * qidiradi — Gemini AI ishlamay qolganda (tarmoq xatosi/timeout) mahalliy
 * fallback klassifikator shundan foydalanadi, shu orqali faqat bir nechta
 * qattiq kodlangan so'z emas, balki BUTUN lug'at bo'yicha "ko'ra oladi".
 */
export function matchCategoryFromText(normalizedText: string): CategoryTextMatch | null {
  if (!normalizedText) return null;
  const patterns = getSortedCategoryPatterns();
  for (const { pattern, canonicalName, objectType } of patterns) {
    if (pattern.length < 3) continue; // juda qisqa so'zlar noto'g'ri mos kelib qolmasligi uchun
    if (normalizedText.includes(pattern)) {
      return { canonicalName, objectType };
    }
  }
  return null;
}
