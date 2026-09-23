import { db } from '@kimbor/db';
import { stripLandmarkSuffixes } from '../dictionary';
import { escapeHtml } from './searchEngine';

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

export async function findAreaListings(
  cityId: string,
  landmarkNameRaw: string | null | undefined
): Promise<AreaListingsResult | null> {
  if (!landmarkNameRaw) return null;
  const cleanName = stripLandmarkSuffixes(landmarkNameRaw).toLowerCase().trim();
  if (!cleanName || cleanName.length < 2) return null;

  const landmark = await db.landmark.findFirst({
    where: {
      cityId,
      OR: [{ name: { equals: cleanName, mode: 'insensitive' } }, { synonyms: { has: cleanName } }],
    },
  });
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
