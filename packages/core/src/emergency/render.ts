import { EMERGENCY_TEMPLATES } from './templates';
import { Language } from './types';
import { normalizeText, containsWholeWord } from '../transliteration';

/**
 * Xabar matnini EMERGENCY_TEMPLATES'dagi HAQIQIY kalit so'zlar ro'yxati
 * bilan solishtirib, ANIQ shablon kalitini (masalan "gas_leak") topadi.
 *
 * Bu funksiya ikki joyda muhim: (1) AI klassifikator ishlamay qolganda
 * fallback rejimida to'g'ri shablonni tanlash uchun, (2) AI'ning o'zi
 * chiqargan "category" qiymati shablon kalitlariga mos kelmasa (masalan
 * "gaz" — "gas_leak" o'rniga) buni TUZATISH uchun, chunki bunday nomuvofiqlik
 * bo'lsa avval favqulodda javob UMUMAN yuborilmay qolar edi.
 */
/** `key` EMERGENCY_TEMPLATES'dagi haqiqiy shablon kaliti ekanini tekshiradi. */
export function isValidEmergencyCategory(key: string | null | undefined): boolean {
  return !!key && key in EMERGENCY_TEMPLATES;
}

export function detectEmergencyCategory(text: string): string | null {
  const normalized = normalizeText(text);
  for (const key of Object.keys(EMERGENCY_TEMPLATES)) {
    const data = EMERGENCY_TEMPLATES[key];
    for (const kw of data.keywords) {
      if (containsWholeWord(normalized, normalizeText(kw))) {
        return key;
      }
    }
  }
  return null;
}

export interface LocalNumbers {
  mahalliy_gaz?: string;
  mahalliy_suv?: string;
  mahalliy_elektr?: string;
  mahalliy_issiqlik?: string;
  mahalliy_hokimiyat?: string;
}

export function renderEmergencyTemplate(
  category: string,
  lang: Language = 'lotin',
  localNumbers: LocalNumbers = {},
  serviceListingsFormatted?: string
): string | null {
  const data = EMERGENCY_TEMPLATES[category];
  if (!data) return null;

  let text = data.templates[lang] || data.templates.lotin;

  // Placeholder labels based on language
  const labels: Record<keyof LocalNumbers, Record<Language, string>> = {
    mahalliy_gaz: {
      lotin: '📞 {num} — Gaz idorasi',
      kirill: '📞 {num} — Газ идораси',
      rus: '📞 {num} — Горгаз',
    },
    mahalliy_suv: {
      lotin: '📞 {num} — Suv ta\'minoti avariya xizmati',
      kirill: '📞 {num} — Сув таъминоти авария хизмати',
      rus: '📞 {num} — Аварийная служба горводоканала',
    },
    mahalliy_elektr: {
      lotin: '📞 {num} — Elektr tarmoqlari',
      kirill: '📞 {num} — Электр тармоқлари',
      rus: '📞 {num} — Горэлектросеть',
    },
    mahalliy_issiqlik: {
      lotin: '📞 {num} — Issiqlik ta\'minoti',
      kirill: '📞 {num} — Иссиқлик таъминоти',
      rus: '📞 {num} — Теплосеть',
    },
    mahalliy_hokimiyat: {
      lotin: '📞 {num} — Shahar hokimiyati',
      kirill: '📞 {num} — Шаҳар ҳокимияти',
      rus: '📞 {num} — Хокимият города',
    },
  };

  // Replace placeholders or strip lines if missing
  const keys: (keyof LocalNumbers)[] = [
    'mahalliy_gaz',
    'mahalliy_suv',
    'mahalliy_elektr',
    'mahalliy_issiqlik',
    'mahalliy_hokimiyat',
  ];

  for (const key of keys) {
    const placeholder = `{${key}}`;
    const numValue = localNumbers[key];
    if (numValue && numValue.trim().length > 0) {
      const formattedLine = labels[key][lang].replace('{num}', numValue.trim());
      text = text.replace(placeholder, formattedLine);
    } else {
      // Remove line completely if missing
      text = text.replace(new RegExp(`^.*${placeholder}.*$\\n?`, 'gm'), '');
    }
  }

  // Replace Level 2 service listings placeholder
  if (data.level === 2) {
    if (serviceListingsFormatted && serviceListingsFormatted.trim().length > 0) {
      text = text.replace('{santexnik_royxati}', serviceListingsFormatted);
      text = text.replace('{elektrik_royxati}', serviceListingsFormatted);
    } else {
      text = text.replace('{santexnik_royxati}', 'Hozircha ustalar bazada yo\'q.');
      text = text.replace('{elektrik_royxati}', 'Hozircha ustalar bazada yo\'q.');
    }
  }

  // Clean up any double blank lines left by missing placeholders
  return text.replace(/\n{3,}/g, '\n\n').trim();
}
