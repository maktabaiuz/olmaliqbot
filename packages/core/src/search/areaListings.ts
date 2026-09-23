import { db } from '@kimbor/db';
import { stripLandmarkSuffixes } from '../dictionary';
import { escapeHtml } from './searchEngine';
import { normalizeText, containsWholeWord } from '../transliteration';

/**
 * "Bo'stonda nima bor?" turidagi ochiq hudud-so'rovi (2026-09) — aniq
 * kategoriya YO'Q, faqat mo'ljal (odatda mahalla) nomi bor. Bu ATAYLAB
 * `searchListings()`dan ALOHIDA, mustaqil funksiya: `searchListings()`ning
 * asosiy "bitta eng mos yozuv + muqobillar" mantig'iga bu so'rov turi
 * sig'maydi (bu yerda "eng mosi" emas, o'sha yerdagi HAMMA narsa kerak) —
 * shu sabab mavjud, ko'p marta sinovdan o'tgan qidiruv funksiyasiga
 * tegilmasdan, yangi, alohida yo'l sifatida qurildi.
 *
 * MUHIM: bu FAQAT mo'ljal ANIQ (harfma-harf yoki sinonim orqali) topilib,
 * unga BOG'LIQ haqiqiy yozuv(lar) borida ishlaydi — aks holda `null`
 * qaytadi va chaqiruvchi oddiy (mavjud) qidiruv yo'liga davom etadi.
 */
export interface AreaListingsResult {
  landmarkName: string;
  formattedText: string;
  totalCount: number;
}

const MAX_AREA_LISTINGS = 20;

// MUHIM (2026-09, real sinov bilan tasdiqlandi): Gemini bu so'rov turini
// (kategoriyasiz, faqat "shu yerda nima bor" so'rovi) ISHONCHLI ravishda
// tanimadi — production'da "Oydinda nima bor?" ga hatto yangi promptdagi
// aniq ta'lim (classifierPrompt.ts 5b-bo'lim) bilan ham past ishonch
// (0.35) va bo'sh `landmark` bilan javob berdi. Shu sabab bu yerda AI'dan
// MUSTAQIL, deterministik ikkinchi yo'l bor: xabar matnining o'zidan
// (AI aytgan `landmark`dan qat'i nazar) haqiqiy mo'ljal nomini to'g'ridan
// to'g'ri qidiradi — xuddi localDispatcher.ts'dagi kabi, AI ishonchsiz
// bo'lgan hollarda ham ishlaydi.
export const AREA_BROWSE_TRIGGER_RE = /\b(nima bor|nimalar bor|qanday xizmat\w*|qanday joylar|nima bor ekan)\b/;

export function isAreaBrowseQuery(rawMessage: string): boolean {
  return AREA_BROWSE_TRIGGER_RE.test(normalizeText(rawMessage));
}

async function resolveLandmark(cityId: string, cleanName: string) {
  return db.landmark.findFirst({
    where: {
      cityId,
      OR: [{ name: { equals: cleanName, mode: 'insensitive' } }, { synonyms: { has: cleanName } }],
    },
  });
}

/**
 * Xabar matnining o'zidan (AI ta'kidlagan `landmark`ga qaramasdan) real
 * mo'ljal nomini qidiradi — shahardagi barcha mo'ljallar nomi/sinonimlari
 * xabar ichida BUTUN SO'Z sifatida uchraydimi tekshiriladi. Mo'ljallar
 * soni odatda kam (~50-100), shu sabab bu tekshiruv arzon.
 */
async function findLandmarkMentionInText(cityId: string, rawMessage: string) {
  const normalized = normalizeText(rawMessage);
  const landmarks = await db.landmark.findMany({ where: { cityId }, select: { id: true, name: true, synonyms: true } });
  // Uzunroq (aniqroq) nomlar avval tekshiriladi — qisqa umumiy so'z
  // ("bozor") uzunroq, aniqroq nomdan ("katta bozor") oldin mos kelib
  // qolmasin.
  const candidates = landmarks
    .flatMap((l) => [l.name, ...l.synonyms].map((n) => ({ landmark: l, norm: normalizeText(n) })))
    .filter((c) => c.norm.length >= 3)
    .sort((a, b) => b.norm.length - a.norm.length);
  for (const c of candidates) {
    if (containsWholeWord(normalized, c.norm)) return c.landmark;
  }
  return null;
}

export async function findAreaListings(
  cityId: string,
  landmarkNameRaw: string | null | undefined,
  rawMessageFallback?: string | null
): Promise<AreaListingsResult | null> {
  let landmark: { id: string; name: string } | null = null;

  if (landmarkNameRaw) {
    const cleanName = stripLandmarkSuffixes(landmarkNameRaw).toLowerCase().trim();
    if (cleanName && cleanName.length >= 2) {
      landmark = await resolveLandmark(cityId, cleanName);
    }
  }
  if (!landmark && rawMessageFallback) {
    landmark = await findLandmarkMentionInText(cityId, rawMessageFallback);
  }
  if (!landmark) return null;

  const listings = await db.listing.findMany({
    where: { cityId, status: 'ACTIVE', primaryLandmarkId: landmark.id },
    include: { category: true },
    orderBy: { bayesianRating: 'desc' },
    take: MAX_AREA_LISTINGS,
  });
  if (listings.length === 0) return null;

  const byCategory = new Map<string, { emoji: string; items: { name: string; phone: string }[] }>();
  for (const l of listings) {
    const catName = l.category?.name || "Boshqa";
    const emoji = l.category?.emoji || '🔧';
    if (!byCategory.has(catName)) byCategory.set(catName, { emoji, items: [] });
    byCategory.get(catName)!.items.push({ name: l.name, phone: l.phone });
  }

  let text = `📍 <b>${escapeHtml(landmark.name)}</b> — ${listings.length} ta yozuv topildi:\n\n`;
  for (const [catName, { emoji, items }] of byCategory) {
    text += `${emoji} <b>${escapeHtml(catName)}</b>\n`;
    for (const item of items) {
      text += `— ${escapeHtml(item.name)}: <code>${escapeHtml(item.phone)}</code>\n`;
    }
    text += '\n';
  }

  return { landmarkName: landmark.name, formattedText: text.trim(), totalCount: listings.length };
}
