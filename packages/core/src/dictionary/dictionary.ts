import initialDictionaryData from './initialDictionary.json';
import { normalizeText } from '../transliteration';

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
  return lookup.get(normalized) || inputName;
}
