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
