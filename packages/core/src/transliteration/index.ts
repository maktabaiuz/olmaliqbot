// Transliteration module: Uzbek Latin <-> Uzbek Cyrillic <-> Russian mapping

const CYRL_TO_LATIN_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': "'", 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu',
  'я': 'ya', 'ў': "o'", 'қ': 'q', 'ғ': "g'", 'ҳ': 'h',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J',
  'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
  'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts',
  'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': "'", 'Ы': 'I', 'Ь': '', 'Э': 'E', 'Ю': 'Yu',
  'Я': 'Ya', 'Ў': "O'", 'Қ': 'Q', 'Ғ': "G'", 'Ҳ': 'H'
};

/**
 * Converts Uzbek Cyrillic text to normalized Uzbek Latin text.
 */
export function cyrillicToLatin(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += CYRL_TO_LATIN_MAP[char] !== undefined ? CYRL_TO_LATIN_MAP[char] : char;
  }
  return result;
}

/**
 * Normalizes Uzbek/Russian input text into lowercase Latin representation for matching.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  const latinized = cyrillicToLatin(text.trim().toLowerCase());
  return latinized
    .replace(/[`’'‘ʼ]/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Generates 3-script index forms: Latin, Cyrillic, and normalized text.
 */
export function indexThreeScripts(text: string): { latin: string; cyrillic: string; normalized: string } {
  const normalized = normalizeText(text);
  return {
    latin: normalized,
    cyrillic: text.toLowerCase(),
    normalized
  };
}

/**
 * Ikki matn orasidagi tahrirlash (Levenshtein) masofasi — yozilish
 * xatolariga (typo) chidamli qidiruv uchun ishlatiladi.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// So'roq/umumiy so'zlar — jargon iborani yoki xabarni solishtirishdan oldin
// olib tashlanadi, shunda faqat "yadro" (masalan "baliq haus") qoladi va
// "nomeri", "kerak" kabi qo'shimchalar solishtirishga xalaqit bermaydi.
const NOISE_WORDS = new Set([
  'kerak', 'bormi', 'bormikan', 'kimda', 'bor', 'nomeri', 'nomer', 'raqami', 'raqam',
  'telefoni', 'telefon', 'dastavka', 'degan', 'qayerda', 'joylashgan', 'manzili',
  'qanday', 'qancha', 'qanaqa', 'vaqti', 'yoki', 'kim', 'biladi', 'aytinglar', 'edi',
  'bolsa', "bo'lsa", 'kerakmi', 'bera', 'olasizmi', 'bermi', 'kiradi', 'ochiq', 'yopiq',
  'qayoqda', 'qaerda', 'ega', 'bolarkan', 'bolarmikan',
]);

/**
 * Xabar/jargon iborasini solishtirish uchun "yadro" shaklga keltiradi:
 * kichik harf, so'roq/umumiy so'zlar olib tashlanadi, bo'shliq va tinish
 * belgilari yig'ishtiriladi. Natijada "Baliq haus nomeri kerakmi?" va
 * "baliqhaus" bir xil "baliqhaus" shakliga keladi.
 */
export function coreMatchText(text: string): string {
  if (!text) return '';
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter((w) => w && !NOISE_WORDS.has(w));
  return words.join('').replace(/[^a-z0-9]/g, '');
}

/**
 * Oddiy "includes" substring qidiruvi qisqa so'zlarda tasodifiy mos kelib
 * qolishi mumkin — masalan "kafe" (qahvaxona) so'zi "kafel" (plitka) so'zining
 * ICHIDA ham topilib qoladi, natijada "kafel yotqizadigan usta kerak" degan
 * xabar xato ravishda "Kafe" kategoriyasiga mos kelib qolgan edi. Shu sabab
 * bunday tekshiruvlar FAQAT MUSTAQIL SO'Z sifatida (chap-o'ng tomonida harf
 * bo'lmaganda) hisoblanishi kerak. Dastlab zeroLayerFilter.ts'da "дым"/"qildim"
 * xatosi uchun yaratilgan, endi umumiy, qayta ishlatiladigan holatga o'tkazildi.
 */
export function containsWholeWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  let fromIndex = 0;
  const isWordChar = (c: string | undefined) => !!c && /[a-z0-9']/i.test(c);
  while (true) {
    const idx = haystack.indexOf(needle, fromIndex);
    if (idx === -1) return false;
    const before = idx === 0 ? undefined : haystack[idx - 1];
    const after = haystack[idx + needle.length];
    if (!isWordChar(before) && !isWordChar(after)) return true;
    fromIndex = idx + 1;
  }
}
