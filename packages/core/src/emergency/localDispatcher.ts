import { db } from '@kimbor/db';
import { normalizeText, containsWholeWord } from '../transliteration';
import { UZBEK_STOPWORDS } from '../search/uzbekStopwords';

/**
 * "Mahalliy raqamlar" ekranida admin qo'shgan QO'SHIMCHA dispecher/xizmat
 * raqamlari (mahalliy jargon so'zlar bilan) — 5 ta qattiq kodlangan
 * favqulodda raqamdan (gaz/suv/elektr/issiqlik/hokimiyat) FARQLI o'laroq,
 * bular hayotiy xavf emas, oddiy ma'lumot-so'rovlar. Shu sabab mos kelsa
 * bot HECH QANDAY "DARHOL bunday qiling" shablonisiz, FAQAT so'ralgan
 * ma'lumotni (nomi + telefon) qaytaradi.
 *
 * Aniq (harfma-harf yoki butun ibora) moslik ishlatiladi — fuzzy/taxminiy
 * emas, chunki bu yerda noto'g'ri musbat xato ma'lumot (boshqa xizmat
 * raqamini) berib yuborishi mumkin.
 */
export interface LocalDispatcherMatch {
  label: string;
  phoneNumber: string;
  /** Admin AI yordamida tanlagan xabar matni (HTML, {phone} allaqachon
   * haqiqiy raqamga almashtirilgan) — bo'lmasa standart format ishlatiladi. */
  formattedText: string;
  linkUrl: string | null;
  linkLabel: string | null;
  linkButtonStyle: 'primary' | 'success' | 'danger' | null;
}

/** Standart (shablon tanlanmagan) format — 🏢 nomi + 📞 raqam. */
function defaultLocalDispatcherText(label: string, phoneNumber: string): string {
  return `🏢 <b>${label}</b>\n📞 <code>${phoneNumber}</code>`;
}

function renderLocalDispatcherText(
  label: string,
  phoneNumber: string,
  messageTemplate: string | null
): string {
  if (!messageTemplate) return defaultLocalDispatcherText(label, phoneNumber);
  // Admin AI shablonini tanlaganida {phone} joy-belgisi bo'lishi shart
  // (backend shart qilib tekshiradi), lekin ehtiyot chorasi sifatida bu
  // yerda ham: agar negadir yo'q bo'lib qolsa, raqam oxiriga qo'shiladi
  // (hech qachon butunlay yo'qolib ketmasin).
  if (!messageTemplate.includes('{phone}')) {
    return `${messageTemplate}\n📞 <code>${phoneNumber}</code>`;
  }
  return messageTemplate.replace(/\{phone\}/g, `<code>${phoneNumber}</code>`);
}

// MUHIM (2026-09, ikkinchi bosqich): dastlab faqat "Qo'shimcha mahalliy
// raqamlar" (admin erkin qo'shadigan) jargon bilan ishlar edi. Endi 5 ta
// ASOSIY dispecher raqami (gaz/suv/elektr/issiqlik/hokimiyat) ham AYNAN
// SHU EmergencyNumber jadvalida (qattiq kodlangan `key` bilan) saqlanadi
// va ularga ham jargon so'z qo'shish mumkin — shu bilan "gaz idorasi
// raqami bormi" kabi oddiy INFORMATSION so'rov ham (favqulodda "gaz hidi
// kelyapti" xabaridan FARQLI o'laroq) jargon orqali to'g'ridan-to'g'ri
// topilib, faqat raqam bilan javob beriladi — dramatik shablon shart emas.
// Bu 5 ta kalit BIR JOYDA — apps/api (admin CRUD) va apps/bot (shablon
// render + {mahalliy_...} to'ldirish) ikkalasi ham AYNAN shundan
// foydalanadi, shu bilan ikki tomon hech qachon bir-biridan uzilib
// qolmaydi.
export const CORE_EMERGENCY_KEYS: { key: string; label: string; templateVar: string; help: string }[] = [
  {
    key: 'gas_office',
    label: 'Gaz idorasi (mahalliy)',
    templateVar: 'mahalliy_gaz',
    help: "Gaz hidi/avariyasida 104 va 112 dan keyin ko'rsatiladigan shahar gaz xizmati raqami",
  },
  {
    key: 'water_dept',
    label: "Suv ta'minoti (mahalliy)",
    templateVar: 'mahalliy_suv',
    help: "Quvur yorilishi, issiq/sovuq suv yo'qligida ko'rsatiladigan suv avariya xizmati raqami",
  },
  {
    key: 'power_grid',
    label: 'Elektr tarmoqlari (mahalliy)',
    templateVar: 'mahalliy_elektr',
    help: "Tok urishi va elektr avariyasida ko'rsatiladigan mahalliy elektr xizmati raqami",
  },
  {
    key: 'heating_dept',
    label: "Issiqlik ta'minoti (mahalliy)",
    templateVar: 'mahalliy_issiqlik',
    help: "Isitish yo'qligida ko'rsatiladigan issiqlik tarmog'i raqami",
  },
  {
    key: 'city_hall',
    label: 'Hokimiyat navbatchisi',
    templateVar: 'mahalliy_hokimiyat',
    help: "Liftda qolish kabi ma'muriy holatlarda ko'rsatiladigan hokimiyat navbatchi raqami",
  },
];
const CORE_EMERGENCY_KEY_SET = new Set(CORE_EMERGENCY_KEYS.map((k) => k.key));

/**
 * Dramatik favqulodda shablonlarga ({mahalliy_gaz} va h.k.) joylashtirish
 * uchun — 5 ta ASOSIY raqamni bitta so'rovda o'qiydi. MUHIM: bu funksiya
 * ATAYLAB `jargonWords`ga qaramaydi (hatto jargon bo'sh bo'lsa ham, agar
 * telefon raqami kiritilgan bo'lsa, dramatik shablonda ko'rinishi kerak).
 */
const coreNumbersCache = new Map<string, { value: Record<string, string>; expiresAt: number }>();

export async function getCoreEmergencyNumbers(
  cityId: string
): Promise<Record<string, string>> {
  if (!cityId) return {};
  const cached = coreNumbersCache.get(cityId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const rows = await db.emergencyNumber.findMany({
    where: { cityId, key: { in: Array.from(CORE_EMERGENCY_KEY_SET) } },
    select: { key: true, phoneNumber: true },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.phoneNumber]));
  const result: Record<string, string> = {};
  for (const { key, templateVar } of CORE_EMERGENCY_KEYS) {
    result[templateVar] = byKey.get(key) || '';
  }
  coreNumbersCache.set(cityId, { value: result, expiresAt: Date.now() + LOCAL_DISPATCHER_CACHE_TTL_MS });
  return result;
}

const LOCAL_DISPATCHER_CACHE_TTL_MS = 30_000;
type LocalDispatcherEntry = {
  label: string;
  phoneNumber: string;
  jargonWords: string[];
  messageTemplate: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  linkButtonStyle: string | null;
};
const cache = new Map<string, { entries: LocalDispatcherEntry[]; expiresAt: number }>();

async function getLocalDispatcherEntries(cityId: string): Promise<LocalDispatcherEntry[]> {
  const cached = cache.get(cityId);
  if (cached && cached.expiresAt > Date.now()) return cached.entries;

  const rows = await db.emergencyNumber.findMany({
    where: { cityId, jargonWords: { isEmpty: false } },
    select: { label: true, phoneNumber: true, jargonWords: true, messageTemplate: true, linkUrl: true, linkLabel: true, linkButtonStyle: true },
  });
  cache.set(cityId, { entries: rows, expiresAt: Date.now() + LOCAL_DISPATCHER_CACHE_TTL_MS });
  return rows;
}

// MUHIM (2026-09, real skrinshot bilan tasdiqlangan XATO — "Горсетни
// номери борми" so'roviga admin ALLAQACHON saqlagan "gorset nomeri kimda
// bor" jargoni MOS KELMADI): avvalgi mantiq faqat BUTUN ibora matnda
// so'zma-so'z bor-yo'qligini tekshirardi. O'zbek tili qo'shimchali til —
// odam ko'pincha jargon saqlangan SHAKLDAN farqli, o'z so'zlari bilan
// yozadi ("gorsetNI" — qo'shimchali, "kimda bor" o'rniga "bormi"). Endi
// searchEngine.ts'dagi bilan bir xil, o'zbek tilining qo'shimchali
// tabiatiga mos SO'Z DARAJASIDAGI moslik ishlatiladi: jargon iborasidan
// umumiy (stop-so'z) bo'lmagan ENG XOS so'z ajratib olinadi va xabar
// matnida (qo'shimchali shaklda bo'lsa ham, umumiy o'zak orqali) qidiriladi.
const GENERIC_LOCAL_WORDS = new Set([
  'nomer', 'nomeri', 'raqam', 'raqami', 'telefon', 'telefoni', 'kontakt',
  'bor', 'bormi', 'yoq', "yo'q", 'kerak', 'kimda', 'kim', 'qayerda',
  'qanday', 'nima', 'qachon', 'dispechir', 'dispetcher', 'xizmati',
  'idorasi', 'boladimi', 'bolsa', 'kelyapti', 'ketdi', 'ochib', 'qoldi',
]);

/** O'zbek tili qo'shimchali (agglutinativ) — qo'shimcha so'z OXIRIGA
 * qo'shiladi, o'zak o'zgarmaydi. "gorset" / "gorsetni" shu qoidaga mos. */
function wordsShareStem(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= 4 && longer.startsWith(shorter);
}

function extractDistinctiveJargonWords(phrase: string): string[] {
  return normalizeText(phrase)
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !UZBEK_STOPWORDS.has(w) && !GENERIC_LOCAL_WORDS.has(w));
}

export async function findLocalDispatcherMatch(
  rawMessage: string,
  cityId: string
): Promise<LocalDispatcherMatch | null> {
  if (!rawMessage || !cityId) return null;
  const normalized = normalizeText(rawMessage);
  if (!normalized) return null;
  const msgWords = normalized.split(/\s+/).filter(Boolean);

  const entries = await getLocalDispatcherEntries(cityId);
  for (const entry of entries) {
    for (const jargon of entry.jargonWords) {
      const normJargon = normalizeText(jargon);
      if (!normJargon || normJargon.length < 3) continue;

      // 1) Butun ibora matnda bor (eng ishonchli, aniq moslik).
      if (normalized.includes(normJargon) || containsWholeWord(normalized, normJargon)) {
        return {
          label: entry.label,
          phoneNumber: entry.phoneNumber,
          formattedText: renderLocalDispatcherText(entry.label, entry.phoneNumber, entry.messageTemplate),
          linkUrl: entry.linkUrl,
          linkLabel: entry.linkLabel,
          linkButtonStyle: entry.linkButtonStyle as 'primary' | 'success' | 'danger' | null,
        };
      }

      // 2) Butun ibora mos kelmasa — jargondagi ENG XOS (umumiy bo'lmagan)
      // so'z xabarda (qo'shimchali shaklda bo'lsa ham) uchraydimi.
      const distinctiveWords = extractDistinctiveJargonWords(jargon);
      const hasWordMatch = distinctiveWords.some((jw) =>
        msgWords.some((mw) => wordsShareStem(jw, mw))
      );
      if (hasWordMatch) {
        return {
          label: entry.label,
          phoneNumber: entry.phoneNumber,
          formattedText: renderLocalDispatcherText(entry.label, entry.phoneNumber, entry.messageTemplate),
          linkUrl: entry.linkUrl,
          linkLabel: entry.linkLabel,
          linkButtonStyle: entry.linkButtonStyle as 'primary' | 'success' | 'danger' | null,
        };
      }
    }
  }
  return null;
}
