import { db } from '@kimbor/db';
import { normalizeText, containsWholeWord } from '../transliteration';

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
const cache = new Map<string, { entries: { label: string; phoneNumber: string; jargonWords: string[] }[]; expiresAt: number }>();

async function getLocalDispatcherEntries(
  cityId: string
): Promise<{ label: string; phoneNumber: string; jargonWords: string[] }[]> {
  const cached = cache.get(cityId);
  if (cached && cached.expiresAt > Date.now()) return cached.entries;

  const rows = await db.emergencyNumber.findMany({
    where: { cityId, jargonWords: { isEmpty: false } },
    select: { label: true, phoneNumber: true, jargonWords: true },
  });
  cache.set(cityId, { entries: rows, expiresAt: Date.now() + LOCAL_DISPATCHER_CACHE_TTL_MS });
  return rows;
}

export async function findLocalDispatcherMatch(
  rawMessage: string,
  cityId: string
): Promise<LocalDispatcherMatch | null> {
  if (!rawMessage || !cityId) return null;
  const normalized = normalizeText(rawMessage);
  if (!normalized) return null;

  const entries = await getLocalDispatcherEntries(cityId);
  for (const entry of entries) {
    for (const jargon of entry.jargonWords) {
      const normJargon = normalizeText(jargon);
      if (!normJargon || normJargon.length < 3) continue;
      // Butun ibora matnda bor (masalan "mahalla raisi" so'zma-so'z), YOKI
      // (bitta so'zli jargon bo'lsa) so'z chegarasi bilan aniq mos keladi.
      if (normalized.includes(normJargon) || containsWholeWord(normalized, normJargon)) {
        return { label: entry.label, phoneNumber: entry.phoneNumber };
      }
    }
  }
  return null;
}
