import type { Listing } from './types';

/** "👍 92% tavsiya" — TZ: 👍/👎, Bayes o'rtachasi (score 0..5) foizga. */
export function recommendPercent(l: Listing): number | null {
  const total = l.rating.up + l.rating.down;
  if (total === 0) return null;
  return Math.round((l.rating.score / 5) * 100);
}

export const BADGE_LABELS: Record<string, string> = {
  uyga_boradi: 'Uyga boradi',
  '24_7': '24/7',
  kafolat: 'Kafolat',
  karta_qabul_qiladi: 'Karta',
  zudlik_bilan: 'Zudlik bilan',
};
export const badgeLabel = (b: string) => BADGE_LABELS[b] || b.replace(/_/g, ' ');

export const TYPE_META: Record<string, { label: string; icon: string; tint: string; text: string; bg: string }> = {
  USTA: { label: 'Ustalar', icon: 'handyman', tint: 'amber', text: 'text-amber-600', bg: 'bg-amber-50' },
  DOKON_OBYEKT: { label: "Do'konlar", icon: 'storefront', tint: 'emerald', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  MUASSASA: { label: 'Idoralar', icon: 'account_balance', tint: 'blue', text: 'text-blue-600', bg: 'bg-blue-50' },
  TRANSPORT: { label: 'Transport', icon: 'local_taxi', tint: 'orange', text: 'text-orange-600', bg: 'bg-orange-50' },
  ARENDA: { label: 'Arenda', icon: 'key', tint: 'purple', text: 'text-purple-600', bg: 'bg-purple-50' },
  ZAPRAVKA: { label: 'Zapravka', icon: 'local_gas_station', tint: 'rose', text: 'text-rose-600', bg: 'bg-rose-50' },
};

export function formatRent(l: Listing): string | null {
  if (!l.rent) return l.price;
  const amount = l.rent.price.toLocaleString('ru-RU');
  const term = l.rent.term === 'KUNLIK' ? '/ kun' : l.rent.term === 'OYLIK' ? '/ oy' : l.rent.term === 'YILLIK' ? '/ yil' : '';
  return l.rent.currency === 'USD' ? `${amount} $ ${term}` : `${amount} so'm ${term}`;
}

/** "+998 90 123-45-67" */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  const m = d.match(/^(998)(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]}-${m[4]}-${m[5]}` : p;
}

/** Ikki nuqta orasidagi masofa (m) — faqat koordinatasi bor yozuvlarda. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

/** Dollar kursi — serverdagi USD_UZS_RATE (packages/core/src/money.ts) bilan bir xil bo'lsin. */
export const USD_UZS_RATE = 12_800;
export function convertPrice(amount: number, from: 'USD' | 'UZS', to: 'USD' | 'UZS'): number {
  if (from === to) return amount;
  return from === 'USD' ? amount * USD_UZS_RATE : amount / USD_UZS_RATE;
}
