import { INITIAL_DICTIONARY, normalizeText } from '@kimbor/core';

// 0-Qavat Filtr: Kod bo'yicha bepul va tezkor filtr (AI so'rovisiz).
// 90% keraksiz guruh suhbatlarini AI'ga yubormay tashlab yuboradi (return false).

// 1. Savol so'zlari (Lotin, Kirill, Rus)
const QUESTION_KEYWORDS = [
  'kim bor', 'kim biladi', 'kim bilsa', 'bilasizmi', 'bilasizlarmi',
  'aytinglar', 'aytib yuboringlar', 'kerak edi', 'kerak', 'zarur',
  'tavsiya qilinglar', 'maslahat beringlar', 'nomeri', 'nomer', 'raqami', 'raqam',
  'telefoni', 'telefon', 'nechigacha', 'nechida', 'ochiqmi', 'yopiqmi', 'ishlaydimi',
  'qayerda', 'qayerdan', 'manzili', 'qancha', 'qanchaga', 'narxi',
  'ким бор', 'ким билади', 'ким билса', 'билаsizми', 'айтинглар', 'айтиб юборинглар',
  'керак', 'зарур', 'номери', 'номер', 'рақами', 'рақам', 'телефони', 'телефон',
  'нечигача', 'нечида', 'очиқми', 'ёпиқми', 'ишлайдими', 'қаерда', 'манзили', 'қанча', 'нархи',
  'кто знает', 'подскажите', 'кто-нибудь', 'нужен', 'нужна', 'надо', 'номер',
  'телефон', 'контакт', 'где', 'до скольки', 'работает', 'цена', 'сколько'
];

// 2. Favqulodda holat xavfsizlik kalit so'zlari (0-layer hech qachon o'tkazib yubormasligi uchun)
const EMERGENCY_KEYWORDS = [
  'gaz hidi', 'gaz isi', 'gaz chiqyapti', 'gaz sizyapti', 'пахнет газ', 'запах газа', 'утечка газа',
  'yong\'in', 'yongin', 'o\'t ketdi', 'ot ketdi', 'yonyapti', 'olov', 'пожар', 'горит', 'загорелось',
  'tutun', 'tutun bosdi', 'дым', 'задымление',
  'elektr urdi', 'tok urdi', 'ударило током', 'удар током',
  'hushidan ketdi', 'yiqilib tushdi', 'без сознания', 'потерял сознание',
  'qon ketyapti', 'qattiq kesildi', 'кровотечение', 'сильно порезался',
  'avariya', 'mashina urdi', 'авария', 'дтп',
  'suvga cho\'kdi', 'chokdi', 'тонет', 'утонул',
  "o'g'rilik", "ogrilik", "bosqin", "urishyapti", "грабят", "нападение", "драка",
  "bola yo'qoldi", "bola yoqoldi", "пропал ребенок"
];

// 3. Kasb va obyekt kategoriyalari sinonimlari (Normalized Latin & Cyrillic)
const TRADE_KEYWORDS: string[] = [];

// Dictionary'dagi barcha nom va sinonimlarni bir marta yig'ib olamiz
INITIAL_DICTIONARY.categories.forEach((cat) => {
  TRADE_KEYWORDS.push(normalizeText(cat.name));
  cat.synonyms.forEach((syn) => {
    TRADE_KEYWORDS.push(normalizeText(syn));
  });
});

/**
 * 0-Qavat Filtr funksiyasi.
 * Xabarni AI Klassifikatorga yuborish kerak bo'lsa `true`, aks holda `false` qaytaradi.
 */
export function zeroLayerFilter(text: string): boolean {
  if (!text || text.trim().length < 2) return false;

  const normalized = normalizeText(text);

  // 1. Shoshilinch/Favqulodda holat kalit so'zi bormi? (Har doim o'tadi)
  const isEmergencyMatch = EMERGENCY_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
  if (isEmergencyMatch) return true;

  // 2. So'roq belgisi '?' bormi?
  const hasQuestionMark = text.includes('?');

  // 3. Savol so'zlaridan biri bormi?
  const hasQuestionWord = QUESTION_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));

  // 4. Kasb / Obyekt lug'atidan biror so'z bormi?
  const hasTradeKeyword = TRADE_KEYWORDS.some((kw) => kw.length > 2 && normalized.includes(kw));

  // O'tkazish qoidasi: So'roq belgisi '?' VA (Savol so'zi YOKI Kasb lug'ati so'zi)
  // YOKI (Savol so'zi VA Kasb lug'ati so'zi)
  if (hasQuestionMark && (hasQuestionWord || hasTradeKeyword)) {
    return true;
  }

  if (hasQuestionWord && hasTradeKeyword) {
    return true;
  }

  // Agar faqat '?' bo'lib hech qanday ma'noli so'z bo'lmasa ("assalomu alaykum?") -> false
  return false;
}
