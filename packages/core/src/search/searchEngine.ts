import { db } from '@kimbor/db';
import { stripLandmarkSuffixes } from '../dictionary';
import { calculateBayesianRating } from '../index';
import { normalizeText, levenshteinDistance, coreMatchText } from '../transliteration';
import { getBotMessageText, renderLineTemplate } from '../botMessages/botMessageStore';

// Telegram HTML parse_mode uchun xavfsiz escape (ma'lumot bazasidan kelgan
// matnda <, >, & belgilari bo'lsa xabar yuborilmay qolishining oldini oladi)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface SearchOptions {
  cityId: string;
  categoryName?: string | null;
  landmarkName?: string | null;
  badgeFilter?: string[] | null;
  /** Foydalanuvchining asl xabari — jargon so'zlarni to'g'ridan-to'g'ri qidirish uchun (AI klassifikator xato/vaqt tugashi holatida ham topish uchun). */
  rawMessage?: string | null;
  /** AI klassifikatorning "intent" bahosi (masalan "CONTACT", "SERVICE",
   * "HOURS") — "CONTACT" uchun maxsus, qattiqroq mantiq qo'llanadi (pastga
   * qarang: hasWordLevelJargonMatch yaqinidagi izohga). */
  intent?: string | null;
  /** AI klassifikatorning "name" maydoni — foydalanuvchi ANIQ SO'RAGAN
   * narsaning nomi (masalan "LADA magazin"), "landmark"dan (yo'l-yo'riq
   * uchun tilga olingan, lekin so'ralayotgan narsa EMAS) farqli. CONTACT
   * intent uchun ishlatiladi — pastga qarang. */
  name?: string | null;
}

const MIN_JARGON_PHRASE_LENGTH = 4;

// Ko'p kategoriyalarda takrorlanadigan, "identifying" (o'ziga xos) BO'LMAGAN
// umumiy so'zlar — so'z darajasidagi jargon moslikda (hasWordLevelJargonMatch)
// bular hisobga OLINMAYDI, aks holda deyarli har qanday shu turdagi so'rov
// "mos keladi" deb topilib qolar edi (masalan "zaprafka" so'zining o'zi HAR
// QANDAY zaprafka bilan mos kelib, aniqlashtirish vazifasini bajarmaydi).
const GENERIC_JARGON_WORDS = new Set([
  'zaprafka', 'zapravka', 'benzin', 'metan', 'propan', 'yoqilgi', 'quyish',
  'ochiq', 'ochiqmi', 'yopiq', 'yopiqmi', 'ishlaydi', 'ishlaydimi',
  'ishlayapti', 'ishlayaptimi', 'ishlayabdi', 'ishlayabdimi', 'kerak',
  'bormi', 'ekan', 'hozir', 'nechigacha', 'nechida', 'qancha',
]);

// "ishla..." o'zagidan yasalgan barcha fe'l shakllari ("ishlaydi",
// "ishlayapti", "ishlayabdi", "ishlayapdimi" va h.k. — imlo ko'p xilma-xil
// bo'lishi mumkin) — har birini alohida ro'yxatga yozish o'rniga, o'zak
// bo'yicha tekshiramiz, shunda yangi imlo variantlari ham avtomatik
// "umumiy" hisoblanadi.
function isGenericVerbForm(word: string): boolean {
  return word.startsWith('ishla');
}

// MUHIM (2026-09, real skrinshot bilan tasdiqlangan xato, 4-qatlam): faqat
// CHASTOTAGA qarash YETARLI emas — "nomeri" so'zining O'ZI juda ko'p
// yozuvda uchrab, chastota bo'yicha to'g'ri chiqarib tashlanardi, lekin
// N1 Choyxona buni "nemeri" deb (bitta harf farqi bilan) yozgan edi — bu
// YAGONA shu yozuvga xos "kam chastotali" so'z bo'lib chiqib, filtrdan
// yashirincha o'tib ketardi, garchi MA'NOSI xuddi "nomeri" bilan bir xil
// bo'lsa ham. Shu sabab "nomer/raqam/telefon/kontakt" kabi ALOQA so'zlari
// endi ANIQ yozilishidan qat'iy nazar (yozilish xatosiga chidamli, o'zak
// bo'yicha) "umumiy" deb tanilmoqda — bular hech qachon bironta ALOHIDA
// biznesga xos identifikator bo'la olmaydi, qanday yozilishidan qat'iy nazar.
const GENERIC_CONTACT_STEMS = ['nomer', 'raqam', 'telefon', 'kontakt'];
function isGenericContactWord(word: string): boolean {
  return GENERIC_CONTACT_STEMS.some((stem) => {
    if (word.length < stem.length - 2) return false;
    const prefix = word.slice(0, stem.length);
    if (Math.abs(prefix.length - stem.length) > 1) return false;
    return levenshteinDistance(prefix, stem) <= 1;
  });
}

// MUHIM (2026-09, real skrinshot bilan tasdiqlangan JIDDIY xato): statik
// GENERIC_JARGON_WORDS ro'yxati faqat OLDINDAN o'ylab topilgan so'zlarni
// (zaprafka, ochiq, kerak va h.k.) qamrab olardi — lekin amalda har qanday
// biznes o'z jargoniga "X nomeri kerak" uslubida yozadi, ya'ni "nomeri",
// "raqami", "telefoni", "akalar" kabi so'zlar O'ZI o'ziga xos EMAS, faqat
// TASODIFAN ro'yxatda yo'q edi. Natija: "Fartunani nomeri bormi" so'rovi
// "nomeri" so'zi orqali BUTUNLAY ALOQASIZ "Mondo nomeri kerak" jargoniga
// mos kelib qolgan (ikkalasida ham "nomeri" bor xolos). Qo'lda ro'yxat
// tuzish o'rniga endi CHASTOTAGA (frequency) qaraymiz: agar bir so'z
// bazadagi bir nechta TURLI yozuvlarning jargonida uchrasa — bu so'z
// umumiy filler, "o'ziga xos" emas, qancha ko'p ro'yxatga yozilmagan
// so'z bo'lsa ham. Faqat KAM SONLI (odatda BITTA) yozuvga xos so'zgina
// haqiqiy identifikator hisoblanadi.
const WORD_FREQUENCY_THRESHOLD = 2;

function computeJargonWordFrequency(jargonCandidates: { jargonSynonyms: string[] }[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const cand of jargonCandidates) {
    const wordsInThisListing = new Set<string>();
    for (const phrase of cand.jargonSynonyms) {
      for (const w of normalizeText(phrase).split(/\s+/)) {
        if (w.length >= 5) wordsInThisListing.add(w);
      }
    }
    for (const w of wordsInThisListing) freq.set(w, (freq.get(w) || 0) + 1);
  }
  return freq;
}

/**
 * Jargon iborasi BUTUN ibora sifatida mos kelmasa ham (so'z tartibi yoki
 * orasiga boshqa so'z qo'shilgani sabab), uning ENG XOS (uzun, umumiy
 * bo'lmagan, KAM SONLI yozuvga xos) so'zi xabarda alohida so'z sifatida
 * (yoki yozilishga juda yaqin) uchrasa — bu ham yetarli, ishonchli moslik
 * hisoblanadi. Masalan jargon "beshbirdagi karvon zaprafka" va xabar
 * "Beshbirdagi zaprafka ochiqmi" — "karvon" so'zi yo'q, lekin
 * "beshbirdagi" ikkalasida ham bor (va faqat shu bitta yozuvga xos).
 */
function hasWordLevelJargonMatch(
  msgWords: string[],
  jargonPhrase: string,
  wordFrequency: Map<string, number>
): boolean {
  const jargonWords = normalizeText(jargonPhrase)
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 5 &&
        !GENERIC_JARGON_WORDS.has(w) &&
        !isGenericVerbForm(w) &&
        !isGenericContactWord(w) &&
        (wordFrequency.get(w) || 0) <= WORD_FREQUENCY_THRESHOLD
    );
  if (jargonWords.length === 0) return false;
  // MUHIM (2026-09, real skrinshot bilan tasdiqlangan xato, 7-qatlam,
  // OXIRGI): oldingi 2 ta urinish (chegarani ~5dan ~8 harfga toraytirish)
  // baribir YETARLI bo'lmadi — "qiladiganlar" (qil-, "qilmoq" fe'lidan)
  // va "biladiganlar" (bil-, "bilmoq" fe'lidan) — ma'nosi BUTUNLAY BOSHQA
  // ikki fe'l — atigi 1 TA harf farq qiladi (12 harfdan), bu Levenshtein
  // bo'yicha "juda yaqin" bo'lib chiqaveradi, qanday chegara qo'yilmasin.
  // O'zbek tilida "-adiganlar" kabi keng tarqalgan fe'l qo'shimchalari
  // ko'plab, ma'nosi mutlaqo boshqa fe'llarni ham bir-biriga son jihatdan
  // "yaqin" qilib qo'yadi — bu yerda uzunlik/harflar soni ma'noga hech
  // qanday aloqador emas. TEKSHIRILGAN: barcha haqiqiy ishlaydigan
  // holatlar (Beshbir/Deska/Gondra) faqat ANIQ (bir xil) so'z mosligiga
  // tayanadi — Levenshtein "moslashuvchanligi" ularning birortasi uchun
  // ham shart emas edi, faqat qo'shimcha xato manbai bo'lib chiqdi. Shu
  // sabab endi so'z darajasidagi moslik FAQAT ANIQ (harfma-harf) bir xil
  // so'zlarga cheklanadi — yozilish xatosiga chidamlilik esa yuqoridagi
  // BUTUN-IBORA darajasidagi tekshiruvda (kichik farqlarda) allaqachon bor.
  return jargonWords.some((jw) => msgWords.includes(jw));
}

// So'rov ko'rinishidagi xabar signalini tekshiradi. MUHIM (2026-09 topilgan
// jiddiy xato): pastdagi jargon moslashtiruvchi butun xabarni bo'shliqsiz
// "yadro" shaklga siqib, ICHIDA jargon so'z bor-yo'qligini tekshiradi — gap
// tuzilishini UMUMAN hisobga olmaydi. Natijada "labo" so'zini o'z ichiga
// olgan HAR QANDAY xabar (masalan "kecha labo band bo'lib ketdi" degan oddiy
// HIKOYA, so'rov emas) biror listing'ning jargonSynonyms'ida "labo" bo'lsa,
// bot xato ravishda javob berib yuborardi — hatto AI klassifikator to'g'ri
// "NOT_RELEVANT" desa ham, bu ustunroq deb hisoblanardi. Endi jargon moslik
// FAQAT xabar chindan ham biror narsa so'rayotganda ("kerak", "bormi",
// "raqami" kabi so'zlar bilan) YOKI xabarning o'zi qisqa (odam ko'pincha
// so'ragan narsani yolg'iz yozadi: "labo", "Qaroqtoy choyxona") bo'lgandagina
// ishonch bilan qabul qilinadi.
function looksLikeSearchRequest(rawMessage: string): boolean {
  const words = rawMessage.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  if (words.length <= 3) return true; // qisqa xabar — ko'pincha o'zi so'rov
  const n = normalizeText(rawMessage);
  // Faqat CHAP tomondan so'z chegarasi talab qilinadi (o'ng tomondan emas) —
  // o'zbek tili qo'shimchali til bo'lgani uchun ("qayerda" + "ligini" =
  // "qayerdaligini" kabi bitta so'zga yopishib ketadi), qat'iy ikki
  // tomonlama chegara talabi haqiqiy so'rovlarni ("Qaroqtoy choyxona
  // qayerdaligini bilasizmi?") noto'g'ri rad etib qo'yardi.
  // MUHIM: "bormi" ("bor-yo'qligini so'rash") uchun qisqartirilgan "borm"
  // prefiksi ISHLATILMAYDI — "bormadim"/"bormadi" ("bormadim" = "men
  // bormadim", ya'ni SHU YERGA emas, biror joyga BORMASLIK haqida oddiy
  // gap) kabi juda keng tarqalgan, umuman aloqasiz fe'l shakli bilan
  // to'qnashib, xato ijobiy natija berardi (aynan shu turdagi xato tufayli
  // "labo bilan hech qayerga bormadim" degan HIKOYA botni xato uyg'otgan
  // edi). "bormi" so'zining o'zi (to'liq) xavfsiz — qo'shimchalanmaydi.
  return /\b(kerak|bormi|raqam|nomer|telefon|qayerd|kimda|qanaqa|qancha|narx|qanday|ochiqm|nechida|nechigacha|manzil)/.test(n);
}

// Kategoriyada o'ziga xos emoji topilmasa, turi bo'yicha umumiy belgi ishlatiladi
const DEFAULT_EMOJI_BY_OBJECT_TYPE: Record<string, string> = {
  USTA: '🔧',
  DOKON_OBYEKT: '🏪',
  MUASSASA: '🏢',
  TRANSPORT: '🚗',
  ARENDA: '🔑',
  ZAPRAVKA: '⛽',
};

// --- Yozilish xatolariga (typo) chidamli kategoriya moslashtirish ---
// Foydalanuvchi "avtoelektirik" deb yozsa-yu, bazada "Avtoelektrik" deb
// saqlangan bo'lsa, oddiy "contains" qidiruv topa olmaydi (bitta ortiqcha
// harf butun so'zni buzadi). Levenshtein masofasi orqali "yetarlicha yaqin"
// so'zlarni ham moslashtiramiz.

// Xabar matnidan qidiruv "nomzod"larini ajratib oladi: har bir so'z, va
// qo'shni 2 so'zning bo'shliqsiz birikmasi ("avto elektrik" -> "avtoelektrik")
// — shu orqali so'z ajratilgan yoki qo'shib yozilgan variantlarning farqi
// muammo bo'lmaydi.
function extractFuzzyCandidates(text: string): string[] {
  const words = normalizeText(text).replace(/[-']/g, '').split(/\s+/).filter((w) => w.length >= 3);
  const candidates = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    candidates.add(words[i]);
    if (i + 1 < words.length) candidates.add(words[i] + words[i + 1]);
  }
  return Array.from(candidates);
}

/**
 * Bazadagi BARCHA kategoriyalar (nomi + sinonimlari) bilan xabar matnini
 * solishtirib, yozilish xatosi bo'lsa ham eng yaqin mosini topadi.
 * Faqat aniq ("contains") qidiruv hech narsa topmagandagina chaqiriladi.
 */
async function fuzzyFindCategory(searchText: string): Promise<{ id: string; name: string }[]> {
  const candidates = extractFuzzyCandidates(searchText);
  if (candidates.length === 0) return [];

  const allCategories = await db.category.findMany({ select: { id: true, name: true, synonyms: true } });

  // Uzunroq (batafsilroq) nomzod har doim ustuvor — masalan "avto elektrik"
  // so'zlaridan yasalgan "aftoelektirik" nomzodi "Avtoelektrik"ka mos kelsa,
  // shu g'olib chiqishi kerak, qisqagina "elektirik" so'zi umumiy
  // "Elektrik" kategoriyasiga tasodifan yaqinroq bo'lib qolgan taqdirda ham —
  // to'liqroq mos kelish har doim aniqroq signal.
  let best: { id: string; name: string; distance: number; candLength: number } | null = null;
  for (const cat of allCategories) {
    const targets = [cat.name, ...cat.synonyms]
      .map((s) => normalizeText(s).replace(/[\s'-]+/g, ''))
      .filter((t) => t.length >= 4);

    for (const target of targets) {
      for (const cand of candidates) {
        if (Math.abs(target.length - cand.length) > 3) continue;
        const dist = levenshteinDistance(cand, target);
        const threshold = Math.max(1, Math.floor(target.length / 6)); // ~6 harfga 1 ta xato ruxsat
        if (dist > threshold) continue;
        const isBetter =
          !best || cand.length > best.candLength || (cand.length === best.candLength && dist < best.distance);
        if (isBetter) {
          best = { id: cat.id, name: cat.name, distance: dist, candLength: cand.length };
        }
      }
    }
  }

  return best ? [{ id: best.id, name: best.name }] : [];
}

/**
 * Mo'ljal (landmark) uchun ham xuddi kategoriya kabi yozilish xatosiga
 * chidamli qidiruv — masalan admin "Vayonqamat" deb yozgan bo'lsa-yu,
 * foydalanuvchi "Vayonkamat" deb so'rasa ham, ikkalasi ham topilishi kerak.
 */
async function fuzzyFindLandmark(cityId: string, searchText: string): Promise<string[]> {
  const candidates = extractFuzzyCandidates(searchText);
  if (candidates.length === 0) return [];

  const allLandmarks = await db.landmark.findMany({
    where: { cityId },
    select: { id: true, name: true, synonyms: true },
  });

  let best: { id: string; distance: number; candLength: number } | null = null;
  for (const lm of allLandmarks) {
    const targets = [lm.name, ...lm.synonyms]
      .map((s) => normalizeText(s).replace(/[\s'-]+/g, ''))
      .filter((t) => t.length >= 4);

    for (const target of targets) {
      for (const cand of candidates) {
        if (Math.abs(target.length - cand.length) > 3) continue;
        const dist = levenshteinDistance(cand, target);
        const threshold = Math.max(1, Math.floor(target.length / 6));
        if (dist > threshold) continue;
        const isBetter =
          !best || cand.length > best.candLength || (cand.length === best.candLength && dist < best.distance);
        if (isBetter) {
          best = { id: lm.id, distance: dist, candLength: cand.length };
        }
      }
    }
  }

  return best ? [best.id] : [];
}

/** 2-7 o'rinlardan biri uchun to'liq post ma'lumoti — "Yana ko'rish"
 * bosilganda ENDI mavjud xabarga matn qo'shib qo'yish o'rniga, HAR BIRI
 * o'ZINING alohida, to'liq (kerak bo'lsa rasmlari bilan) postida
 * yuboriladi — shu bilan turli yozuvlarning matni/rasmlari bir-biriga
 * ARALASHIB ketmaydi. */
export interface OtherMatch {
  formattedText: string;
  photoUrls: string[];
  /** Bo'lsa — "📍 Lokatsiya" (yashil) tugmasi shu yozuv uchun ham qo'shiladi. */
  mapUrl: string | null;
}

export interface FormattedListingResult {
  listingId: string;
  formattedText: string;
  /** 2-7 o'rinlar — "Yana ko'rish" bosilganda HAR BIRI alohida to'liq post
   * sifatida yuboriladi (1-o'rin allaqachon formattedText'da bor). */
  otherMatches: OtherMatch[];
  hasMore: boolean;
  totalMatches: number;
  executionTimeMs: number;
  listing: any;
}

const MAX_RANKED_RESULTS = 7;
const RANK_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];

// "Bot Matnlari & Shablonlar" (admin panel) shu shablonni tahrirlaydi —
// bazada topilmasa yoki bo'sh bo'lsa shu ASL matn ishlatiladi (2026-09:
// avval bu MATN kod ichida qattiq yozilgan edi, admin panelidan
// tahrirlash imkoni bo'lsa ham hech qachon haqiqiy javobga ta'sir
// qilmasdi — endi getBotMessageText orqali bazadan o'qiladi).
// {kasb_emoji}/{kasb}/{ism}/{tasdiq}/{moljal}/{telefon} — har doim mavjud
// (majburiy maydonlar), qolganlari bo'sh bo'lsa o'sha QATOR butunlay
// chiqmaydi (renderLineTemplate). "Yana ko'rish" tugmasi va daraja-emoji
// (🥈/🥉) BU YERDA emas — ular haqiqiy Telegram tugmasi/pozitsiya belgisi,
// botning o'zi avtomatik qo'shadi, shablon matni emas.
export const DEFAULT_REPLY_TEMPLATE =
  `{kasb_emoji} <b>{kasb}</b>\n\n` +
  `<blockquote>{ism} {tasdiq}\n` +
  `📍 {moljal}\n` +
  `🕐 {ish_vaqti}\n` +
  `🏷 {belgilar}\n` +
  `🛠 {xizmatlar}\n` +
  `💵 {narx}\n` +
  `📝 {tavsif}\n\n` +
  `📞 <code>{telefon}</code></blockquote>`;

/**
 * Bitta yozuv uchun to'liq xabar (sarlavha + native Telegram <blockquote>
 * "karta") matnini bazadagi (admin tahrirlagan) shablon orqali quradi.
 * `rank` berilsa (2-7 o'rinlar uchun), karta oldiga raqam-emoji qo'yiladi
 * — bu shablon ICHIDA emas, avtomatik/pozitsion, admin tahrirlamaydi.
 */
async function buildListingCard(
  item: any,
  bayesianRating: number,
  rank: number | null,
  categoryEmoji: string,
  categoryDisplayName: string
): Promise<string> {
  const verifiedIcon = item.verification === 'VERIFIED' ? '✅' : '⚠️';
  const landmarkText = item.primaryLandmark?.name || '';

  const badgesText = Array.isArray(item.badges) && item.badges.length > 0
    ? item.badges.map((b: string) => b.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(' · ')
    : '';

  let moljalValue = '';
  if (landmarkText) {
    if (item.primaryLandmark?.latitude && item.primaryLandmark?.longitude) {
      const mapUrl = `https://yandex.uz/maps/?pt=${item.primaryLandmark.longitude},${item.primaryLandmark.latitude}&z=16&l=map`;
      moljalValue = `<a href="${mapUrl}">${escapeHtml(landmarkText)}</a>`;
    } else {
      moljalValue = escapeHtml(landmarkText);
    }
  }

  let ishVaqtiValue = '';
  if (item.workFrom && item.workTo) {
    if (item.workFrom === '00:00' && (item.workTo === '24:00' || item.workTo === '23:59')) {
      ishVaqtiValue = '24/7 (Tunu-kun)';
    } else {
      ishVaqtiValue = `${item.workFrom}–${item.workTo}`;
    }
  }

  const template = await getBotMessageText('reply_single_listing', 'lotin', DEFAULT_REPLY_TEMPLATE);
  const rendered = renderLineTemplate(template, {
    kasb_emoji: categoryEmoji,
    kasb: escapeHtml(categoryDisplayName),
    ism: escapeHtml(item.name),
    tasdiq: verifiedIcon,
    moljal: moljalValue,
    ish_vaqti: ishVaqtiValue,
    belgilar: badgesText ? escapeHtml(badgesText) : '',
    xizmatlar: item.specificServices ? escapeHtml(item.specificServices) : '',
    narx: item.approxPrice ? escapeHtml(item.approxPrice) : '',
    tavsif: item.description ? escapeHtml(item.description) : '',
    telefon: escapeHtml(item.phone),
  });

  const rankPrefix = rank ? `${RANK_EMOJI[rank - 1] || `${rank}.`} ` : '';
  return `${rankPrefix}${rendered}`;
}

/**
 * Core Search & Ranking Engine for "Kim bor?"
 * Strictly scoped by cityId.
 */
export async function searchListings(options: SearchOptions): Promise<FormattedListingResult | null> {
  const startTime = Date.now();
  const { cityId, categoryName, landmarkName, badgeFilter, rawMessage } = options;

  if (!cityId) return null;
  if (!categoryName && !landmarkName && !rawMessage) return null;

  // 0. Jargon so'zni to'g'ridan-to'g'ri xabar matnidan qidirish. Admin bazaga
  // qo'shganda odamlar shu narsani qanday so'rashini oldindan yozib qo'ygan
  // bo'ladi (masalan "oydindagi evosni nomeri") — shu orqali AI klassifikator
  // (Gemini) vaqtinchalik ishlamay qolsa yoki noaniq kategoriya chiqarsa ham,
  // bot admin bilgan aniq iborani xabar ichidan topib, javobni yo'qotmaydi.
  // Solishtirish uchun "yadro" shakl: kichik harf, so'roq/umumiy so'zlar
  // ("nomeri", "kerak" kabi) olib tashlangan, bo'shliqsiz. Shu orqali admin
  // uzun ibora yozgan bo'lsa-yu ("Baliq haus nomeri kerak"), foydalanuvchi
  // qisqa so'ragan bo'lsa ham ("Baliq haus"), yoki aksincha — ikkalasi ham
  // moslashadi. Yozilish farqiga (masalan "baliq haus"/"baliqhaus") ham
  // chidamli, chunki bo'shliqlar allaqachon olib tashlangan.
  let jargonMatchedIds = new Set<string>();
  if (rawMessage && looksLikeSearchRequest(rawMessage)) {
    const msgCore = coreMatchText(rawMessage);
    // MUHIM (2026-09 topilgan JIDDIY xato): yuqoridagi moslik BUTUN iborani
    // (bo'shliqsiz "yadro" shaklda) solishtiradi — bu ko'p so'zli jargon
    // iboralar ("beshbirdagi karvon zaprafka") uchun juda qattiq: agar
    // foydalanuvchi so'z tartibini o'zgartirsa yoki orasiga boshqa so'z
    // qo'shsa (masalan "ochiqmi" o'rniga "ishlayabdimi", yoki "karvon"
    // so'zini aytmasa) — moslik butunlay yo'qoladi. Real production'da
    // aniqlandi: AI klassifikator "landmark" maydoni ham har doim ishonchli
    // emas (ba'zan kirill-lotin aralash, masalan "beshbир" kabi buzilgan
    // matn qaytaradi) — shu ikkalasi birga kelib, tegishli jargon
    // ro'yxatdan o'tkazilmagan (yoki noaniq) so'rovlar uchun tizim
    // TASODIFIY (RotationBonus) yozuvni tanlab qo'yishiga olib kelardi —
    // garchi to'g'ri yozuv (masalan "CARVON") bazada ANIQ jargon bilan
    // ro'yxatdan o'tgan bo'lsa ham.
    //
    // Tuzatildi: BUTUN ibora mos kelmasa, endi SO'Z darajasida ham
    // tekshiriladi — jargon iborasining ENG XOS (uzun, umumiy bo'lmagan)
    // so'zi xabarda alohida so'z sifatida (yoki yozilishga yaqin) uchrasa,
    // bu ham yetarli moslik hisoblanadi. Bu orqali "beshbirdagi" so'zining
    // o'zi xabar va jargonda BIR XIL bo'lsa, atrofidagi boshqa so'zlar
    // (tartib/qo'shimcha) farq qilsa ham, to'g'ri yozuv +2000 ustuvorlik
    // bilan (pastdagi directJargonBonus) g'olib chiqadi — tasodifiylik
    // o'rniga.
    const msgWords = normalizeText(rawMessage)
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !GENERIC_JARGON_WORDS.has(w) && !isGenericVerbForm(w) && !isGenericContactWord(w));
    const jargonCandidates = await db.listing.findMany({
      where: { cityId, status: 'ACTIVE', jargonSynonyms: { isEmpty: false } },
      select: { id: true, jargonSynonyms: true },
    });
    const wordFrequency = computeJargonWordFrequency(jargonCandidates);
    for (const cand of jargonCandidates) {
      const hit = cand.jargonSynonyms.some((j) => {
        const jargonCore = coreMatchText(j);
        if (jargonCore.length >= MIN_JARGON_PHRASE_LENGTH && msgCore.length >= MIN_JARGON_PHRASE_LENGTH) {
          // Ikki tomonlama qamrash: xabar jargon "yadrosi"ni o'z ichiga oladimi,
          // yoki aksincha (foydalanuvchi qisqaroq yozgan bo'lsa)
          if (msgCore.includes(jargonCore) || jargonCore.includes(msgCore)) return true;
          // Kichik yozilish xatosiga chidamli oxirgi tekshiruv (uzunliklari yaqin bo'lsa)
          if (Math.abs(msgCore.length - jargonCore.length) <= 3) {
            const threshold = Math.max(1, Math.floor(Math.max(msgCore.length, jargonCore.length) / 6));
            if (levenshteinDistance(msgCore, jargonCore) <= threshold) return true;
          }
        }
        return hasWordLevelJargonMatch(msgWords, j, wordFrequency);
      });
      if (hit) jargonMatchedIds.add(cand.id);
    }
  }

  // Mo'ljal (landmark) BOR-U, kategoriya yoki jargon signali YO'Q holat —
  // bu YETARLI EMAS. Landmark faqat "QAYERDA" ekanini bildiradi, "NIMA
  // kerak"ligini emas. Bu tekshiruv bo'lmasa, tuman/mavze nomi tilga
  // olingan har qanday xabar (masalan "Raduga tomonlar tinchmi?" kabi
  // xavfsizlik savoli) o'sha hududdagi eng yaxshi baholi, umuman aloqasiz
  // yozuv bilan noto'g'ri "javoblanib" qolar edi — AI klassifikator xato
  // qilib landmark ajratib olgan taqdirda ham, bu yerda qat'iy to'xtatiladi.
  if (!categoryName && jargonMatchedIds.size === 0) {
    return null;
  }

  // MUHIM (2026-09, real skrinshot bilan tasdiqlangan xato): "CONTACT"
  // intent — foydalanuvchi ANIQ NOMLANGAN biror narsaning kontaktini
  // so'ragani ("Fartunani nomeri bormi", "Hasan ustaning raqami bormi")
  // — "santexnik kerak" kabi UMUMIY xizmat so'rovidan TUBDAN farq qiladi.
  // Bunday so'rovda, hech qanday jargon moslik (bizning aniq, admin
  // ro'yxatdan o'tkazgan ma'lumotimiz) TOPILMASA — demak biz aynan SHU
  // nomdagi narsani bilmaymiz.
  //
  // MUHIM (2026-09, birinchi urinish YETARLI bo'lmadi): dastlab bu shart
  // qo'shimcha ravishda "va aniq mo'ljal berilmagan bo'lsa" (`!landmarkName`)
  // talab qilardi. Lekin AI klassifikatorning "landmark" maydoni ham
  // ISHONCHSIZ ekani (avvalgi "to'ytepa/beshbир" xatolarida ham
  // ko'rilgan) yana bir bor tasdiqlandi: sinov paytida AI hatto oddiy
  // raqamni ("fartuna 3") "3-mavze" mo'ljal deb NOTO'G'RI talqin qildi —
  // bu esa `!landmarkName` shartini yolg'on ravishda buzib, himoyani
  // ishlamay qoldirardi. CONTACT intent uchun "landmark" maydoni UMUMAN
  // ahamiyatsiz — muhimi FAQAT bitta narsa: bizda bu ANIQ nom (jargon)
  // ro'yxatdan o'tganmi yoki yo'qmi. AI ning "category"/"landmark"
  // taxminlari (ular ISHONCHSIZ, production'da tasdiqlandi: bir xil
  // "fartuna"ga har safar boshqa-boshqa kategoriya/mo'ljal — "taksi",
  // "transport", "3-mavze" — taxmin qilib berardi) bunday holatda
  // UMUMAN e'tiborga olinmaydi.
  if (options.intent === 'CONTACT' && jargonMatchedIds.size === 0) {
    return null;
  }

  // MUHIM (2026-09, real skrinshot bilan tasdiqlangan YANGI xato): yuqoridagi
  // tekshiruv "jargonMatchedIds bo'sh emasmi" deb so'raydi — lekin bu jargon
  // moslik BUTUN xabar matnidan (rawMessage) hisoblanadi, va xabarda
  // FOYDALANUVCHI SO'RAGAN narsadan TASHQARI, faqat YO'L-YO'RIQ uchun tilga
  // olingan boshqa (haqiqiy, jargon bilan ro'yxatdan o'tgan) biznes nomi ham
  // bo'lishi mumkin — masalan "5/3 Sariq bola pizza oldida LADA magazin
  // nomerini bering" — bu yerda "Sariq bola pizza" FAQAT mo'ljal, so'ralgan
  // narsa esa "LADA magazin" (bizda yo'q). Avvalgi tekshiruv "Sariq bola
  // pizza" jargon bilan mos kelgani uchun (u haqiqatan bor, ro'yxatdan
  // o'tgan) himoyani noto'g'ri o'tkazib yuborardi — garchi foydalanuvchi
  // ASLIDA boshqa narsa haqida so'ragan bo'lsa ham.
  //
  // Tuzatildi: AI "name" maydonini (aynan SO'RALGAN narsaning nomi,
  // "landmark"dan farqli) chiqargan bo'lsa, endi FAQAT jargonMatchedIds
  // ichidagi yozuvlar ORASIDA aynan shu "name"ga mos keladigan birortasi
  // bor-yo'qligi tekshiriladi — agar yo'q bo'lsa (ya'ni topilgan jargon
  // moslik faqat YO'L-YO'RIQ uchun tilga olingan boshqa biznesga tegishli
  // bo'lib chiqsa), bot baribir JIM turadi.
  //
  // UMUMLASHTIRILDI (2026-09, foydalanuvchi so'rovi: "bu xato ni topdin
  // tuzatgan narsang bacha qidiruvlarda ham ishlasin"): boshlanishida bu
  // tekshiruv faqat CONTACT intentga tegishli edi. Lekin sinovda AYNAN
  // SHU "mo'ljal aslida boshqa haqiqiy biznes, lekin so'ralgan narsa u
  // emas" xatosi SERVICE va PRICE intentlarda ham qayta hosil qilindi
  // (masalan "...oldida LADA magazin bor, shina bormi" — "Largo" degan
  // ALOQASIZ shinachi ko'rsatilardi; "...LADA magazinda narxlar qancha"
  // — "Sariq Bola Pizza"ning O'ZI ko'rsatilardi). Shu sabab bu tekshiruv
  // endi intentdan qat'i nazar ishlaydi — CONTACT bo'lish shart emas,
  // faqat AI "name" (aniq so'ralgan narsa) ajratib bergan bo'lsa yetarli.
  // Umumiy toifa-qidiruvlarda ("santexnik kerak") odatda "name" bo'sh
  // bo'lgani uchun bu tekshiruv o'z-o'zidan ishga tushmaydi — faqat
  // foydalanuvchi ANIQ bir nomni tilga olgandagina faollashadi.
  if (options.name && jargonMatchedIds.size > 0) {
    const matchedCandidates = await db.listing.findMany({
      where: { id: { in: [...jargonMatchedIds] } },
      select: { id: true, jargonSynonyms: true },
    });
    const nameCore = coreMatchText(options.name);
    const nameWords = normalizeText(options.name)
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !GENERIC_JARGON_WORDS.has(w) && !isGenericVerbForm(w) && !isGenericContactWord(w));
    const nameFrequency = computeJargonWordFrequency(matchedCandidates);
    const nameActuallyMatchesSomething = matchedCandidates.some((cand) =>
      cand.jargonSynonyms.some((j) => {
        const jargonCore = coreMatchText(j);
        if (jargonCore.length >= MIN_JARGON_PHRASE_LENGTH && nameCore.length >= MIN_JARGON_PHRASE_LENGTH) {
          if (nameCore.includes(jargonCore) || jargonCore.includes(nameCore)) return true;
        }
        return hasWordLevelJargonMatch(nameWords, j, nameFrequency);
      })
    );
    if (!nameActuallyMatchesSomething) {
      return null;
    }
  }

  // Query ACTIVE listings strictly scoped by cityId
  const whereCondition: any = {
    cityId,
    status: 'ACTIVE',
  };

  // 1. Category Matching (Name or Synonyms or Direct Listing search)
  let categoryDisplayName = categoryName || 'Xizmat';
  // AI klassifikator ANIQ, bazada haqiqatan ham mavjud kategoriyani topib
  // berganmi (masalan "kafelchi", "santexnik")? Agar ha — pastda jargon
  // moslashtiruvi bu qat'iy kategoriya chegarasidan CHIQIB, boshqa
  // kategoriyadagi yozuvlarni majburan aralashtirib yubormasligi kerak
  // (pastdagi jiddiy xato tuzatilishiga qarang).
  let hasResolvedCategory = false;
  let categoryHasAnyListings = false;

  if (categoryName) {
    const cleanCat = categoryName.trim().toLowerCase();
    let categories = await db.category.findMany({
      where: {
        OR: [
          { name: { contains: cleanCat, mode: 'insensitive' } },
          { synonyms: { has: cleanCat } },
        ],
      },
    });

    // MUHIM (2026-09 topilgan xato): yuqoridagi `synonyms: { has: cleanCat } }`
    // FAQAT massivning BITTA elementi cleanCat bilan AYNAN bir xil bo'lsagina
    // ishlaydi. Lekin ko'p sinonimlar ko'p so'zli iboralar ("benzin quyish",
    // "metan quyish") — AI klassifikator esa ko'pincha foydalanuvchi so'ragan
    // QISQA, bitta so'zni qaytaradi ("benzin"). Natijada "benzin kerak edi"
    // kabi juda oddiy, to'g'ridan-to'g'ri so'rov ham kategoriya topolmay,
    // botning butunlay javob bermay qolishiga olib kelardi — garchi mos
    // kategoriya ("Avtomobil zapravkasi", sinonimi "benzin quyish") bazada
    // aniq mavjud bo'lsa ham. Shu sabab qat'iy moslikdan keyin, lekin
    // (yozilish xatosiga mo'ljallangan, uzunlik farqiga chidamsiz) fuzzy
    // qidiruvdan OLDIN — SO'Z darajasidagi moslikni tekshiramiz: kategoriya
    // nomi so'z(lar)idan biri categoryName so'z(lar)idan biriga ustma-ust
    // tushsa, shu kategoriya ham nomzod hisoblanadi.
    if (categories.length === 0) {
      const catWords = cleanCat.split(/\s+/).filter((w) => w.length >= 4);
      if (catWords.length > 0) {
        const allCategoriesForWordMatch = await db.category.findMany({
          select: { id: true, name: true, synonyms: true },
        });
        const wordMatches = allCategoriesForWordMatch.filter((c) => {
          const targetWords = new Set(
            [c.name, ...c.synonyms].flatMap((s) => s.toLowerCase().split(/\s+/))
          );
          return catWords.some((w) => targetWords.has(w));
        });
        if (wordMatches.length > 0) {
          categories = wordMatches as any;
        }
      }
    }

    // Aniq moslik topilmasa — yozilish xatosiga chidamli qidiruvga o'tamiz
    // (masalan "avtoelektirik" -> "Avtoelektrik").
    //
    // MUHIM (2026-09, real xato bilan tasdiqlangan): avval bu yerga BUTUN
    // xabar matni ham ("Akalar fartunani nomeri bormi" kabi) qo'shib
    // yuborilardi — niyat AI kategoriyani "to'liq" ajrata olmagan holatlar
    // uchun edi. Lekin amalda bu XAVFLI bo'lib chiqdi: AI ba'zan "fartuna"
    // (aslida BIZNES NOMI, umuman kategoriya emas) kabi so'zni categoryName
    // sifatida chiqarib yuboradi — bunday holda BUTUN xabar matnidagi
    // "akalar", "nomeri", "bormi" kabi so'zlar (va ularning juft
    // birikmalari) ham nomzod sifatida tekshirilib, TASODIFAN qandaydir
    // ALOQASIZ kategoriyaga "yaqin" chiqib qolishi mumkin edi — natijada
    // bot HAR SAFAR BOSHQA-BOSHQA, umuman aloqasiz javob berardi (masalan
    // "Mondo" kafeni, keyingi safar "Sushitana"ni). Endi FAQAT AI
    // chiqargan categoryName so'zining o'zi (xabar matni QO'SHILMASDAN)
    // tekshiriladi — bu haqiqiy yozilish xatosini ("avtoelektirik") hali
    // ham to'g'ri tuzatadi, lekin butunlay aloqasiz so'zdan (bo'lishi
    // mumkin bo'lmagan "kategoriya") tasodifiy moslik xavfini yo'qotadi.
    if (categories.length === 0) {
      const fuzzyMatches = await fuzzyFindCategory(cleanCat);
      if (fuzzyMatches.length > 0) {
        categories = fuzzyMatches as any;
      }
    }

    if (categories.length > 0) {
      const categoryIds = categories.map((c) => c.id);
      whereCondition.categoryId = { in: categoryIds };
      categoryDisplayName = categories[0].name;
      hasResolvedCategory = true;
      // Kategoriyaning o'zida (mo'ljal/landmark cheklovidan MUSTAQIL) umuman
      // yozuv bor-yo'qligi — pastdagi jargon-qutqarish bosqichida kerak
      // bo'ladi (candidateListings landmark cheklovi sabab bo'sh bo'lib
      // qolgan holatlarni, kategoriyaning o'zi bo'sh bo'lgan holatlardan
      // farqlash uchun).
      categoryHasAnyListings =
        (await db.listing.count({ where: { cityId, status: 'ACTIVE', categoryId: { in: categoryIds } } })) > 0;
    } else {
      // If Category table didn't match directly, search Listing name, jargonSynonyms, or specificServices
      whereCondition.OR = [
        { name: { contains: cleanCat, mode: 'insensitive' } },
        { jargonSynonyms: { has: cleanCat } },
        { specificServices: { contains: cleanCat, mode: 'insensitive' } },
      ];
    }
  }

  // 2. Landmark Matching with Suffix Stripping ("karzinka oldida" -> "karzinka")
  let cleanLandmarkName: string | null = null;
  let matchedLandmarkIds: string[] = [];

  if (landmarkName) {
    cleanLandmarkName = stripLandmarkSuffixes(landmarkName).toLowerCase();
    const landmarks = await db.landmark.findMany({
      where: {
        cityId,
        OR: [
          { name: { equals: cleanLandmarkName, mode: 'insensitive' } },
          { synonyms: { has: cleanLandmarkName } },
        ],
      },
    });

    matchedLandmarkIds = landmarks.map((l) => l.id);

    // Aniq moslik topilmasa — yozilish xatosiga chidamli qidiruvga o'tamiz
    // (masalan "Vayonkamat" -> "Vayonqamat"). Xabar matni ham qo'shiladi.
    if (matchedLandmarkIds.length === 0) {
      matchedLandmarkIds = await fuzzyFindLandmark(cityId, `${cleanLandmarkName} ${rawMessage || ''}`);
    }
  }

  // Landmark, Service Area & Jargon Synonyms Matching
  // MUHIM (2026-09 topilgan xato): avval bu shart FAQAT `cleanLandmarkName`
  // bo'sh emasligini tekshirardi — hatto HECH QANDAY haqiqiy mo'ljal (aniq
  // yoki fuzzy) topilmagan taqdirda ham. Natijada AI klassifikator noaniq,
  // joy nomi BO'LMAGAN ibora ("yaqin atrofi", "shu yerda" kabi)ni "mo'ljal"
  // deb noto'g'ri ajratib bersa, pastda faqat `jargonSynonyms: {has: ...}`
  // shartigina qo'shilib qolardi — bu esa ALLAQACHON to'g'ri topilgan
  // KATEGORIYA bilan majburan AND'lanib, kategoriyasi to'g'ri, lekin admin
  // maxsus jargon so'z kiritmagan (juda ko'p, aksariyat) yozuvlarni butunlay
  // yashirib qo'yardi. Endi: agar haqiqiy mo'ljal (aniq yoki fuzzy) TOPILMASA
  // va kategoriya ALLAQACHON aniq topilgan bo'lsa — bu noaniq "mo'ljal"
  // signalini butunlay e'tiborsiz qoldiramiz (kategoriya yolg'iz o'zi
  // yetarli). Faqat kategoriya topilmagan holatlarda (bu holda jargon —
  // yagona zaxira signal) eski xulq-atvor saqlanadi.
  //
  // MUHIM (2026-09, ANIQ skrinshot bilan tasdiqlangan YANGI xato): yuqoridagi
  // "e'tiborsiz qoldirish" qoidasi juda KENG edi — u "yaqin atrofi" kabi
  // UMUMIY iboralar UCHUN to'g'ri, lekin AI ba'zan chindan ham ANIQ, lekin
  // bazada MAVJUD BO'LMAGAN joy nomini ham landmark sifatida chiqaradi
  // (masalan "to'ytepa pavarot" — foydalanuvchi chindan ham shu ANIQ joy
  // haqida so'ragan, lekin bizda u yerda zaprafka yo'q). Bunday holatda
  // kategoriya yolg'iz o'zi ASLO yetarli emas — aks holda bot foydalanuvchi
  // so'ragan joy o'rniga BUTUNLAY BOSHQA, aloqasiz joydagi yozuvni "aynan
  // shu" deb ko'rsatib, XATO ma'lumot beradi (bu umuman javob
  // bermaslikdan HAM YOMONROQ — foydalanuvchi noto'g'ri ma'lumotga
  // ishonishi mumkin). Shu sabab farqlanadi: agar landmark chindan ham
  // UMUMIY/noaniq ibora bo'lsa (hozircha: "atrof" ildizli so'zlar —
  // "yaqin atrofi/atrofda/atrofa") — kategoriya yolg'iz yetarli. Aks
  // holda (landmark ANIQ, o'ziga xos joy nomiga o'xshasa) — filtr
  // baribir qo'llaniladi: agar hech narsa (na Landmark jadvali, na
  // jargon) mos kelmasa, natija BO'SH qoladi va bot to'g'ri ravishda JIM
  // turadi — noto'g'ri "eng yaqin" yozuvni taxmin qilib bermaydi.
  const isGenericLocationPhrase = !!cleanLandmarkName && /\batrof/.test(cleanLandmarkName);
  if (matchedLandmarkIds.length > 0 || (cleanLandmarkName && !(hasResolvedCategory && isGenericLocationPhrase))) {
    const landmarkOrConditions: any[] = [];
    if (matchedLandmarkIds.length > 0) {
      landmarkOrConditions.push({ primaryLandmarkId: { in: matchedLandmarkIds } });
      landmarkOrConditions.push({ serviceAreaLandmarks: { some: { id: { in: matchedLandmarkIds } } } });
    }
    if (cleanLandmarkName) {
      landmarkOrConditions.push({ jargonSynonyms: { has: cleanLandmarkName } });
    }
    
    if (whereCondition.OR) {
      // Combine with existing category/text OR condition
      whereCondition.AND = [
        { OR: whereCondition.OR },
        { OR: landmarkOrConditions }
      ];
      delete whereCondition.OR;
    } else {
      whereCondition.OR = landmarkOrConditions;
    }
  }

  // Badge Filtering
  if (badgeFilter && badgeFilter.length > 0) {
    whereCondition.badges = { hasEvery: badgeFilter };
  }

  let candidateListings = await db.listing.findMany({
    where: whereCondition,
    include: {
      category: true,
      primaryLandmark: true,
      serviceAreaLandmarks: true,
      reviews: true,
    },
  });

  // Agar categoryName/landmarkName umuman berilmagan bo'lsa (faqat rawMessage
  // orqali jargon qidiruvi bo'lgan holat), whereCondition hali ham shahar
  // bo'yicha CHEKSIZ ro'yxatni qaytaradi — bunday holatda faqat jargon so'z
  // orqali aniq topilgan yozuvlar bilan cheklaymiz.
  if (!categoryName && !landmarkName) {
    candidateListings = candidateListings.filter((l) => jargonMatchedIds.has(l.id));
  }

  // Jargon orqali topilgan, lekin structured (kategoriya/mo'ljal) filtrga
  // to'g'ri kelmagani uchun natijaga tushmagan yozuvlarni ham qo'shib qo'yamiz —
  // admin qo'shgan aniq ibora har doim ustuvor topilishi kerak.
  //
  // MUHIM (2026-09 topilgan JIDDIY XATO): bu qo'shish FAQAT AI aniq
  // kategoriya bera OLMAGAN hollarda bajarilishi kerak. Jargon moslashtiruvi
  // butun xabar matnini (coreMatchText) bitta uzun "yadro" satrga siqib,
  // ICHIDA jargon so'z bor-yo'qligini substring sifatida tekshiradi — bu
  // qisqa/umumiy jargon so'zlar (masalan taksi/mashina xizmati uchun
  // qo'shilgan "moshina" so'zi) BUTUNLAY ALOQASIZ xabarlarda ham (masalan
  // "moshina eshigini remont qiladigan usta qayerda ishlaydi" — bu ustani
  // izlash, taksi emas) tasodifan uchrab qoladi. Bunday holatda, agar AI
  // ANIQ va bazada haqiqatan mavjud kategoriyani (masalan "kafelchi")
  // aniqlab bergan bo'lsa, boshqa kategoriyadagi (masalan "taksi") yozuvni
  // shu kategoriya chegarasidan tashqarida turib, faqat umumiy jargon so'zi
  // ustida majburan qo'shib yuborish — foydalanuvchiga BUTUNLAY ALOQASIZ
  // odamning telefon raqamini berib yuborishga olib keladi. Shu sabab, AI
  // kategoriyani aniq topib bergan holatlarda, jargon moslik FAQAT o'sha
  // kategoriya ichidagi yozuvlarga cheklanadi.
  // MUHIM (2026-09 topilgan XATO, tuzatildi): yuqoridagi chegara faqat
  // resolved kategoriyada HAQIQATDA yozuv bo'lgandagina mantiqiy — aks
  // holda hech narsani himoya qilmaydi, faqat aniq jargon moslikni bekorga
  // to'sib qo'yadi. Bu real ishlab chiqarishda tasdiqlangan: yangi
  // (sinonimsiz) kategoriya yaratilganda AI har safar boshqacha, tasodifiy
  // kategoriya nomi taxmin qiladi ("balon" o'rniga "avtomobil shinasi",
  // "avtoshohobcha" va h.k.) — agar shu taxmin TASODIFAN bazadagi BOSHQA,
  // BO'SH (hech qanday yozuvi yo'q) kategoriya bilan mos kelib qolsa,
  // to'g'ri javob (masalan jargon orqali aniq topilgan "Largo" balon
  // do'koni) HECH QACHON ko'rsatilmasdi — garchi hech qanday haqiqiy
  // "aralashib ketish" xavfi yo'qligiga qaramay (himoya qiladigan yozuv
  // umuman yo'q edi).
  // MUHIM (2026-09, "to'ytepa pavarot" xatosi bilan bog'liq qo'shimcha
  // tuzatish): yuqoridagi shart avval `candidateListings.length > 0`ni
  // tekshirardi — bu "balon kerak" holati uchun to'g'ri edi (kategoriya
  // haqiqatan BO'SH bo'lganda himoyaning ma'nosi yo'q). Lekin ENDI
  // candidateListings ANIQ, lekin bazada yo'q mo'ljal (masalan "to'ytepa
  // pavarot") sabab ham bo'sh bo'lib qolishi mumkin — bu holda kategoriya
  // O'ZI bo'sh EMAS, shunchaki mo'ljal filtri hech narsa qoldirmagan.
  // Bunday holatda ham chegara (boshqa kategoriyadagi jargon aralashib
  // ketmasligi) albatta qo'llanilishi kerak — aks holda foydalanuvchi
  // so'ragan ANIQ, mavjud bo'lmagan joy o'rniga ALOQASIZ kategoriyadagi
  // biror yozuv "botqoqlab" chiqib qolishi mumkin edi.
  const candidateIds = new Set(candidateListings.map((l) => l.id));
  let missingJargonIds = [...jargonMatchedIds].filter((id) => !candidateIds.has(id));
  if (missingJargonIds.length > 0 && hasResolvedCategory && categoryHasAnyListings) {
    const resolvedCategoryIds = new Set(
      (Array.isArray(whereCondition.categoryId?.in) ? whereCondition.categoryId.in : []) as string[]
    );
    const missingListingsCategoryCheck = await db.listing.findMany({
      where: { id: { in: missingJargonIds } },
      select: { id: true, categoryId: true },
    });
    const sameCategoryIds = new Set(
      missingListingsCategoryCheck.filter((l) => resolvedCategoryIds.has(l.categoryId)).map((l) => l.id)
    );
    missingJargonIds = missingJargonIds.filter((id) => sameCategoryIds.has(id));
  }
  if (missingJargonIds.length > 0) {
    const extraJargonListings = await db.listing.findMany({
      where: { id: { in: missingJargonIds }, cityId, status: 'ACTIVE' },
      include: {
        category: true,
        primaryLandmark: true,
        serviceAreaLandmarks: true,
        reviews: true,
      },
    });
    candidateListings = [...candidateListings, ...extraJargonListings];
  }

  if (candidateListings.length === 0) {
    return null;
  }

  // 4. Ranking Formula:
  // Score = BaseVerification + (BayesianRating * 0.5) + (ReviewCount * 0.2) + (RecencyScore * 0.15) + (CompletenessScore * 0.15) + RotationBonus
  const scoredListings = candidateListings.map((item) => {
    const isVerifiedBonus = item.verification === 'VERIFIED' ? 1000 : 0;

    // Recalculate Bayesian Rating dynamically
    const thumbsUp = item.reviews.filter((r) => r.isPositive).length || item.thumbsUpCount;
    const thumbsDown = item.reviews.filter((r) => !r.isPositive).length || item.thumbsDownCount;
    const bayesianRating = calculateBayesianRating(thumbsUp, thumbsDown);
    const reviewCount = thumbsUp + thumbsDown;

    const ratingScore = bayesianRating * 0.5;
    const countScore = reviewCount * 0.2;

    // Recency score (days since last verification)
    const daysSinceVerified = Math.max(0, (Date.now() - new Date(item.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = daysSinceVerified <= 30 ? 1.0 : Math.max(0.1, 1.0 - (daysSinceVerified - 30) * 0.01);

    const completenessScore = (item.completenessScore || 50) / 100;

    // Rotation bonus for unrated new listings (0 reviews) so they get discovered
    const rotationBonus = reviewCount === 0 ? Math.random() * 3 : 0;

    // Jargon match bonus (+500 score) so exact local jargon matches rank first
    const hasJargonMatch = cleanLandmarkName && item.jargonSynonyms?.some((j) => j.toLowerCase().includes(cleanLandmarkName.toLowerCase()));
    const jargonBonus = hasJargonMatch ? 500 : 0;

    // Xabar matnida admin qo'shgan jargon ibora to'g'ridan-to'g'ri topilgan
    // bo'lsa — bu eng aniq signal, hatto tasdiqlanganlik holatidan ham
    // ustunroq bo'lishi kerak (AI klassifikator xato/vaqt tugagan bo'lsa ham).
    const directJargonBonus = jargonMatchedIds.has(item.id) ? 2000 : 0;

    // Admin kategoriya ichida "1/2/3-o'rin" deb belgilagan yozuv — bu HAR
    // QANDAY boshqa signaldan (tasdiqlanganlik, reyting, jargon) ustunroq
    // turishi SHART, aks holda "Yana" tugmasi belgilangan tartibda emas,
    // tasodifiy tartibda ko'rsatib qo'yadi. 1-o'rin > 2-o'rin > 3-o'rin >
    // barcha boshqa (belgilanmagan) yozuvlar — shu sabab bonus qiymatlari
    // bir-biridan katta farq bilan (10 000) ajratilgan.
    const priorityBonus =
      item.priorityRank === 1 ? 1_000_000 : item.priorityRank === 2 ? 990_000 : item.priorityRank === 3 ? 980_000 : 0;

    const totalScore =
      priorityBonus +
      isVerifiedBonus +
      jargonBonus +
      directJargonBonus +
      ratingScore +
      countScore +
      recencyScore * 0.15 +
      completenessScore * 0.15 +
      rotationBonus;

    return {
      listing: item,
      bayesianRating,
      reviewCount,
      score: totalScore,
    };
  });

  scoredListings.sort((a, b) => b.score - a.score);

  // Yulduzcha (Bayesian rating) bo'yicha eng yaxshi 7 tasi — 1-7 ketma-ketlikda "Yana ko'rish"ga chiqadi
  const rankedTop = scoredListings.slice(0, MAX_RANKED_RESULTS);
  const topMatches = rankedTop.map((s) => s.listing);
  const bestMatch = topMatches[0];
  const bestBayesianRating = rankedTop[0].bayesianRating;

  // Sarlavhada har doim TOPILGAN yozuvning haqiqiy kategoriyasini ko'rsatamiz —
  // klassifikator taxminini emas (masalan Gemini ishlamay qolib, chalkash matn
  // chiqargan bo'lsa ham, foydalanuvchiga toza va to'g'ri nom ko'rinadi).
  categoryDisplayName = bestMatch.category?.name || categoryDisplayName;

  // Kategoriyaga mos ikonka (masalan santexnik -> 🚿, taksi -> 🚕) — har bir
  // javob bir xil umumiy 🔧 belgisi bilan emas, aynan shu kasbga mos ko'rinadi.
  // Kategoriyada o'ziga xos emoji bo'lmasa (masalan admin qo'lda qo'shgan yangi
  // kategoriya), turi (Usta/Do'kon/Muassasa/Transport) bo'yicha umumiy belgi ishlatiladi.
  const categoryEmoji = bestMatch.category?.emoji || DEFAULT_EMOJI_BY_OBJECT_TYPE[bestMatch.category?.objectType || ''] || '🔧';

  // 5. Qisqa, toza guruh javobi (Telegram HTML parse_mode) — matn shablon
  // bazasidan (admin panelida tahrirlanadigan) olinadi, buildListingCard
  // ichida quriladi.
  const formattedText = await buildListingCard(bestMatch, bestBayesianRating, null, categoryEmoji, categoryDisplayName);

  // 2-7 o'rinlar — 1-o'rin bilan BIR XIL "karta" uslubi (sarlavha + blockquote)
  // va HAR BIRI o'zining rasmlari (agar bor bo'lsa) bilan. "Yana ko'rish"
  // bosilganda ENDI mavjud xabarga qo'shib qo'yish O'RNIGA, har biri
  // O'ZINING alohida, to'liq postida yuboriladi — matn/rasmlar
  // aralashib ketmasligi uchun (1-o'rin formattedText'da allaqachon bor).
  const otherMatches: OtherMatch[] = await Promise.all(
    rankedTop.slice(1).map(async (s, i) => ({
      formattedText: await buildListingCard(s.listing, s.bayesianRating, i + 2, categoryEmoji, categoryDisplayName),
      photoUrls: Array.isArray(s.listing.photoUrls) ? s.listing.photoUrls : [],
      mapUrl: s.listing.mapUrl || null,
    }))
  );

  const executionTimeMs = Date.now() - startTime;

  return {
    listingId: bestMatch.id,
    formattedText,
    otherMatches,
    hasMore: scoredListings.length > 1,
    totalMatches: rankedTop.length,
    executionTimeMs,
    listing: bestMatch,
  };
}
