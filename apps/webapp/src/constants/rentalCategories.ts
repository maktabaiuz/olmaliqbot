// Ko'chmas mulk arenda kategoriyalari (2026-09) — shu nomlardan biri
// tanlanganda forma xonalar soni/narx/valyuta/muddat maydonlarini
// ko'rsatadi (qarang: packages/core/src/dictionary/initialDictionary.json
// dagi mos CategorySeed nomlari — bu yerda ANIQ bir xil yozilishi SHART).
export const RENTAL_CATEGORY_NAMES = new Set([
  'Kvartira arendasi',
  'Uy/Hovli arendasi',
  'Kunlik ijara kvartira',
  'Mehmonxona (Hotel)',
  'Hostel',
  'Notijorat arendasi',
]);

export const RENT_TERM_TYPE_OPTIONS: { value: 'KUNLIK' | 'OYLIK' | 'YILLIK'; label: string }[] = [
  { value: 'KUNLIK', label: 'Kunlik' },
  { value: 'OYLIK', label: 'Oylik' },
  { value: 'YILLIK', label: 'Yillik' },
];

export const RENT_CURRENCY_OPTIONS: { value: 'UZS' | 'USD'; label: string }[] = [
  { value: 'UZS', label: "So'm" },
  { value: 'USD', label: '$' },
];
