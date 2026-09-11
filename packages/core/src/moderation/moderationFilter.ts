import { normalizeText, containsWholeWord } from '../transliteration';

/**
 * moderationFilter.ts
 *
 * Guruh xabarlarini xavfsizlik nuqtai nazaridan tekshiradigan, TO'LIQ
 * MAHALLIY (AI so'rovisiz, bepul, millisekundlarda ishlaydigan) filtrlar
 * to'plami. Bu ataylab AI'ga bog'liq QILINMAGAN — chunki (1) moderatsiya
 * HAR BIR xabarda ishlashi kerak (Gemini'ning tor bepul-tarif byudjetini
 * bunga sarflash oqilona emas), (2) tezkor bo'lishi shart (spam guruhga
 * ko'rinib ulgurmasdan o'chirilishi kerak).
 *
 * Faqat "aniq, past xato ehtimolli" toifalar shu yerda: so'kinish,
 * shubhali/spam havolalar, qimor reklamasi, klassik firibgarlik iboralari.
 * Nozik mavzular (siyosat, mansabdorlarni haqorat, 18+ tasvir) ATAYLAB
 * bu yerga kiritilmagan — ular AI/qo'l bilan ko'rib chiqishni talab
 * qiladigan, xato ehtimoli yuqoriroq alohida bosqich.
 */

export type ModerationCategory = 'PROFANITY' | 'SPAM_LINK' | 'GAMBLING' | 'SCAM';

export interface ModerationResult {
  violated: boolean;
  category: ModerationCategory | null;
}

// --- 1) SO'KINISH / HAQORATLI SO'ZLAR -------------------------------------
// O'zbek va rus tilidagi eng keng tarqalgan so'kinish/haqorat so'zlari.
// Ataylab "to'liq mos so'z" (containsWholeWord) orqali tekshiriladi —
// Levenshtein-fuzzy qidiruv ISHLATILMAYDI, chunki bu begunoh so'zlarni
// (masalan tasodifan yaqin yozilgan so'zlarni) xato tutib qolish xavfini
// oshiradi — so'kinish filtri uchun aniqlik tezlikdan muhimroq.
const PROFANITY_WORDS = [
  // O'zbekcha
  'jalab', 'qotoq', 'qotaq', 'kot', 'kutoq', 'amaqi', 'amma qusi',
  'suka', 'padla', 'gandon', 'ablah', 'nomard', 'harom', 'itvachcha',
  'eshak', 'eshshak', 'malades', 'chuchka',
  // Ruscha (transliteratsiya + kirill)
  'blyat', 'blyad', 'suka', 'pidor', 'pidaras', 'huy', 'hui', 'ebat',
  'ebal', 'mudak', 'debil', 'tvar', 'skotina',
  'блять', 'блядь', 'сука', 'пидор', 'пидорас', 'хуй', 'ебать',
  'мудак', 'дебил', 'тварь', 'скотина', 'гандон',
];

export function detectProfanity(rawText: string): boolean {
  const n = normalizeText(rawText);
  if (!n) return false;
  return PROFANITY_WORDS.some((w) => containsWholeWord(n, normalizeText(w)));
}

// --- 2) SHUBHALI / SPAM HAVOLALAR ------------------------------------------
// Haqiqiy biznes egalari o'z do'koni/Instagram sahifasini ulashishi
// TABIIY holat — shu sabab HAMMA havolani emas, faqat SPAM'ga XOS
// naqshlarni (qisqartirilgan havolalar, boshqa guruhga taklif havolasi)
// belgilaymiz. Bu — atayin ehtiyotkor (kam xato-musbat) yondashuv.
const URL_REGEX = /(https?:\/\/|www\.)[^\s]+/gi;

const SUSPICIOUS_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'cutt.ly', 'is.gd', 'shorte.st', 'clck.ru',
  'goo.gl', 'ow.ly', 'rebrand.ly', 'v.gd', 'tiny.cc', 'shrtco.de',
];

export function detectSpamLink(rawText: string): boolean {
  const lowerFull = rawText.toLowerCase();

  // t.me/joinchat yoki t.me/+XXXX (boshqa guruhga TAKLIF havolasi) —
  // "http"siz ham yozilishi mumkin ("t.me/+abc123").
  if (/t\.me\/(joinchat\/|\+)/i.test(lowerFull)) return true;

  // Qisqartirilgan havola xizmatlari — bular deyarli HAR DOIM "http://"
  // yoki "www." PREFIKSSIZ yoziladi (masalan "bit.ly/abc123"), shuning
  // uchun to'liq URL_REGEX'ga emas, butun xabar matniga qarshi tekshiramiz.
  if (SUSPICIOUS_SHORTENERS.some((s) => lowerFull.includes(s))) return true;

  // Qolgan har qanday to'liq (http/www bilan boshlanuvchi) havola ham
  // qo'shimcha qidiriladi — kelajakda yangi shubhali domenlar qo'shilsa,
  // shu yerga qo'shish kifoya.
  const urls = rawText.match(URL_REGEX);
  if (urls) {
    for (const url of urls) {
      const lower = url.toLowerCase();
      if (SUSPICIOUS_SHORTENERS.some((s) => lower.includes(s))) return true;
    }
  }

  return false;
}

// --- 3) QIMOR REKLAMASI ---------------------------------------------------
// Taniqli qimor/bukmeker brendlari + umumiy qimor so'zlari. Faqat brend
// nomi YOKI (umumiy so'z + reklama belgisi) birgalikda topilsa ishga
// tushadi — shunchaki "stavka" so'zining o'zi (boshqa ma'noda ham
// ishlatilishi mumkin) yetarli emas.
const GAMBLING_BRANDS = [
  '1xbet', '1xbat', 'mostbet', 'melbet', 'parimatch', 'pinup', 'pin-up',
  'betwinner', 'olabet', '888starz', 'linebet', 'megapari', '1win',
  'vulkan', 'joycasino',
];
const GAMBLING_GENERIC = ['qimor', 'stavka', 'bukmeker', 'kazino', 'казино', 'ставка', 'букмекер'];
const PROMO_SIGNALS = ['promo', 'bonus', 'ro\'yxatdan o\'ting', "ro'yhatdan o'ting", 'kod', 'фрибет', 'freebet'];

export function detectGamblingAd(rawText: string): boolean {
  const n = normalizeText(rawText);
  if (!n) return false;
  if (GAMBLING_BRANDS.some((b) => n.includes(normalizeText(b)))) return true;
  const hasGeneric = GAMBLING_GENERIC.some((w) => containsWholeWord(n, normalizeText(w)));
  const hasPromo = PROMO_SIGNALS.some((w) => n.includes(normalizeText(w)));
  return hasGeneric && hasPromo;
}

// --- 4) KLASSIK FIRIBGARLIK IBORALARI --------------------------------------
const SCAM_PATTERNS: RegExp[] = [
  /\bpul\s*yutdingiz\b/i,
  /\bg['`o]?lib\s*(bo['`o]?ldingiz|deb\s*topildingiz)\b/i,
  // "Tabriklaymiz ... yutdingiz" — orada summa/valyuta bo'lishi mumkin
  // ("50 000 000 som yutdingiz"), shu sabab ikkala so'z orasidagi
  // masofaga chidamli qilib qurilgan.
  /\btabriklaymiz\b.{0,60}\byutdingiz\b/i,
  /\byutdingiz\b.{0,60}\btabriklaymiz\b/i,
  /\bbepul\s*kredit\b/i,
  /\binvestitsiya.{0,20}(\d{2,4})\s*%/i,
  /\b\d{2,4}\s*%.{0,20}(foyda|daromad)\b/i,
  /\bkunlik\s*daromad\b/i,
  /\buyda\s*ishlab\s*(pul\s*top|top)/i,
  /работа\s*на\s*дому/i,
  /быстрый\s*заработок/i,
  /выиграли\s*приз/i,
  /поздравляем.{0,60}выиграли/i,
];

export function detectScamPhrase(rawText: string): boolean {
  const n = normalizeText(rawText);
  if (!n) return false;
  return SCAM_PATTERNS.some((re) => re.test(n) || re.test(rawText));
}

/**
 * Barcha "oson" (AI'siz, tez) filtrlarni birma-bir tekshiradi va birinchi
 * topilgan toifani qaytaradi. Tartib ahamiyatsiz — bittasi topilsa yetarli
 * (xabar baribir o'chiriladi).
 */
export function checkEasyModerationFilters(rawText: string): ModerationResult {
  if (!rawText || !rawText.trim()) return { violated: false, category: null };
  if (detectProfanity(rawText)) return { violated: true, category: 'PROFANITY' };
  if (detectScamPhrase(rawText)) return { violated: true, category: 'SCAM' };
  if (detectGamblingAd(rawText)) return { violated: true, category: 'GAMBLING' };
  if (detectSpamLink(rawText)) return { violated: true, category: 'SPAM_LINK' };
  return { violated: false, category: null };
}
