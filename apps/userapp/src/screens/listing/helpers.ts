import type { Listing } from '../../lib/types';

/** "2 kun oldin" — sharhlar uchun nisbiy sana. */
export function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} kun oldin`;
  if (d < 30) return `${Math.floor(d / 7)} hafta oldin`;
  if (d < 365) return `${Math.floor(d / 30)} oy oldin`;
  return `${Math.floor(d / 365)} yil oldin`;
}

/** mapUrl bo'lsa o'sha, bo'lmasa koordinatadan Yandex havola, aks holda null. */
export function locationUrl(l: Listing): string | null {
  if (l.mapUrl) return l.mapUrl;
  if (l.location) return `https://yandex.uz/maps/?pt=${l.location.lng},${l.location.lat}&z=17&l=map`;
  return null;
}

export const shareLink = (id: string) => `https://t.me/uz11_bot?start=listing_${id}`;

/** "Gaz plitasi sozlash, Kolonka ta'miri" → alohida qatorlar. */
export const splitServices = (s: string | null): string[] =>
  (s || '')
    .split(/[,;\n•]+/)
    .map((x) => x.trim())
    .filter(Boolean);
