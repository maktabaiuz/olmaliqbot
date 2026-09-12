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

// --- 2) HAVOLALAR — "RUXSAT ETILMAGAN HAMMASI TAQIQLANADI" ----------------
// 2026-09 qaror: avval faqat "shubhali" havolalar (qisqartirilgan havolalar
// va h.k.) tutilardi. Endi mantiq TESKARISIGA o'zgardi — bu bot yoqilgan
// guruhda ODDIY foydalanuvchilar UMUMAN HECH QANDAY havola yubora olmaydi,
// zararli-zararsizligidan qat'iy nazar. Faqat ANIQ ro'yxatga olingan
// domenlar (guruh admin qo'shgan + bizning o'z domenlarimiz, quyida
// enforceModeration.ts'da) o'tadi. Bu qat'iyroq, lekin ancha oddiy va
// bashorat qilinadigan qoida — "aql bilan hukm qilish" o'rniga "ruxsat
// ro'yxati" (allowlist) orqali ishlaydi.
const URL_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|uz|ru|io|me|shop|store|biz|info|online|site|xyz|club|tv|co|uk|us|app|dev)(?:\/[^\s]*)?)/gi;

export function extractUrls(rawText: string): string[] {
  return rawText.match(URL_REGEX) || [];
}

// URL'ni "domen[/yo'l]" shakliga keltiradi — protokol, "www.", oxirgi "/"
// va query/fragment (?..., #...) olib tashlanadi, solishtirish uchun.
function normalizeUrlForCompare(url: string): { domain: string; path: string } {
  let u = url.toLowerCase().trim();
  u = u.replace(/^https?:\/\//, '').replace(/^www\./, '');
  u = u.split(/[?#]/)[0];
  u = u.replace(/\/+$/, '');
  const slashIdx = u.indexOf('/');
  if (slashIdx === -1) return { domain: u, path: '' };
  return { domain: u.slice(0, slashIdx), path: u.slice(slashIdx) };
}

/**
 * Berilgan URL ruxsat etilgan ro'yxatdagi biror yozuvga mos keladimi?
 * Yozuv faqat domen ("olmaliq.online") yoki domen+yo'l
 * ("instagram.com/olmaliqshop") bo'lishi mumkin. Sub-domen firibgarligidan
 * ("olmaliq.online.evil.com") himoyalanish uchun domen aniq mos kelishi
 * yoki uning haqiqiy sub-domeni bo'lishi shart (oddiy "startsWith" emas).
 */
export function isUrlAllowed(url: string, allowedEntries: string[]): boolean {
  const { domain: urlDomain, path: urlPath } = normalizeUrlForCompare(url);
  return allowedEntries.some((entry) => {
    const { domain: entryDomain, path: entryPath } = normalizeUrlForCompare(entry);
    if (!entryDomain) return false;
    const domainMatches = urlDomain === entryDomain || urlDomain.endsWith(`.${entryDomain}`);
    if (!domainMatches) return false;
    if (!entryPath) return true;
    return urlPath === entryPath || urlPath.startsWith(`${entryPath}/`);
  });
}

export function detectDisallowedLink(rawText: string, allowedEntries: string[] = []): boolean {
  const urls = extractUrls(rawText);
  if (urls.length === 0) return false;
  return urls.some((u) => !isUrlAllowed(u, allowedEntries));
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
 *
 * `enabledCategories` berilsa — FAQAT o'sha toifalar tekshiriladi ("Foydali
 * botlar" bo'limida har bir guruh o'zi kerakli botlarni tanlab yoqadi,
 * qolganlari o'sha guruhda umuman ishlamasligi kerak). Berilmasa (masalan
 * eski testlar/skriptlar uchun) — hammasi tekshiriladi.
 *
 * `allowedLinkEntries` — SPAM_LINK uchun: shu guruhda ruxsat etilgan
 * domenlar ro'yxati (bizning o'z domenlarimiz + admin qo'shganlari).
 */
export function checkEasyModerationFilters(
  rawText: string,
  enabledCategories?: Set<ModerationCategory>,
  allowedLinkEntries: string[] = []
): ModerationResult {
  if (!rawText || !rawText.trim()) return { violated: false, category: null };
  const isOn = (c: ModerationCategory) => !enabledCategories || enabledCategories.has(c);

  if (isOn('PROFANITY') && detectProfanity(rawText)) return { violated: true, category: 'PROFANITY' };
  if (isOn('SCAM') && detectScamPhrase(rawText)) return { violated: true, category: 'SCAM' };
  if (isOn('GAMBLING') && detectGamblingAd(rawText)) return { violated: true, category: 'GAMBLING' };
  if (isOn('SPAM_LINK') && detectDisallowedLink(rawText, allowedLinkEntries)) return { violated: true, category: 'SPAM_LINK' };
  return { violated: false, category: null };
}

// "Foydali botlar" admin bo'limida ko'rsatiladigan barcha botlarning yagona
// haqiqat manbai (key, nom, tavsif, ikonka) — admin API va bot ijrosi
// (enforceModeration.ts) ikkalasi ham shu ro'yxatdan foydalanadi, shunda
// nom/tavsif ikki joyda alohida-alohida yozilib, bir-biridan uzoqlashib
// qolmaydi.
export interface UsefulBotDefinition {
  key: 'PROFANITY' | 'SPAM_LINK' | 'GAMBLING' | 'SCAM' | 'FLOOD';
  name: string;
  description: string;
  icon: string;
}

export const USEFUL_BOTS: UsefulBotDefinition[] = [
  {
    key: 'PROFANITY',
    name: "So'kinish filtri",
    description: "So'kinish/haqoratli so'zlar yozilgan xabarni o'chirib, yozuvchini 1 soatga jim qiladi.",
    icon: '🤬',
  },
  {
    key: 'SPAM_LINK',
    name: 'Spam-link filtri',
    description: "Ruxsat etilgan ro'yxatda yo'q har qanday havolani o'chiradi (jim qilmasdan).",
    icon: '🔗',
  },
  {
    key: 'GAMBLING',
    name: 'Qimor filtri',
    description: "Qimor/bukmeker (1xBet va h.k.) reklamalarini o'chiradi.",
    icon: '🎰',
  },
  {
    key: 'SCAM',
    name: 'Firibgarlik filtri',
    description: '"Pul yutdingiz", "bepul kredit" kabi klassik firibgarlik iboralarini o\'chiradi.',
    icon: '💸',
  },
  {
    key: 'FLOOD',
    name: 'Flud filtri',
    description: "Bir zumda ko'p xabar yozishni (spam-bombardimon) to'xtatadi. Haqiqiy so'rovlarga tegmaydi.",
    icon: '🌊',
  },
];
