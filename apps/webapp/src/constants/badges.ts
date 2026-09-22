// MUHIM (2026-09): bu ro'yxatlar AddListingScreen (yaratish) va
// ListingDetailScreen (tahrirlash) ikkalasida BIR XIL bo'lishi SHART —
// backend (extractRequestedBadges.ts, searchEngine.ts) belgilarni ANIQ
// (harfma-harf) satr sifatida solishtiradi. Agar ikkala ekranda ro'yxat
// har xil yozilsa (masalan "Propan" / "propan"), admin belgini qo'shsa
// ham qidiruv uni "ko'rmaydi" — xuddi shu turdagi xato "Propan" yoqilg'i
// turi hech qanday zapravkada aniqlanmay qolgan real holatda topilgan edi.
export const DEFAULT_BADGE_OPTIONS = [
  'Uyga boradi', 'Kafolat', '24/7', 'Karta', 'Zudlik', 'Ruscha',
  'Bepul yetkazib berish', 'Nasiya', 'Sertifikatlangan',
];

export const ZAPRAVKA_BADGE_OPTIONS = ['Metan', 'Propan', 'AI-80', 'AI-91', 'AI-92', 'AI-95', 'Dizel', '24/7'];
