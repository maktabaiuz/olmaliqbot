import initialDictionaryData from './initialDictionary.json';

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
    const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
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
