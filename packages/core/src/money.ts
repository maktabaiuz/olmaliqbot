/**
 * Pul hisob-kitoblari — BITTA joyda (2026-10-08). Avval dollar↔so'm uch xil
 * ishlardi: guruh qidiruvi boshqa valyutadagi uylarni narxsiz o'tkazib
 * yuborardi, ilova esa ularni butunlay yashirardi, moderatsiya 12800 bilan
 * hisoblardi. Kurs .env'dagi USD_UZS_RATE bilan o'zgartiriladi.
 */
export const USD_UZS_RATE = Number(process.env.USD_UZS_RATE) > 0 ? Number(process.env.USD_UZS_RATE) : 12_800;

export type Currency = 'USD' | 'UZS';

/** Narxni berilgan valyutaga o'giradi. */
export function convertPrice(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return from === 'USD' ? amount * USD_UZS_RATE : amount / USD_UZS_RATE;
}

/** Oylik ekvivalent (kunlik ×30, yillik ÷12) — narxlarni solishtirish uchun. */
export function monthlyEquivalent(amount: number, term?: 'KUNLIK' | 'OYLIK' | 'YILLIK' | null): number {
  return term === 'KUNLIK' ? amount * 30 : term === 'YILLIK' ? amount / 12 : amount;
}
