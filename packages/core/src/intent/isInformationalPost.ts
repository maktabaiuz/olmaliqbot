/**
 * Ma'lumot posti / e'lon — SAVOL EMAS (2026-10-07, real holat: "Eng ko'p
 * so'raladigan raqamlar ro'yxati" — 15+ telefon raqamli uzun post bir necha
 * marta guruhga tashlangan, bot har safar unga choyxona va elektr raqami
 * bilan "javob" bergan).
 *
 * Umumiy belgi (so'z ro'yxati emas): xabarda 2 tadan ortiq telefon raqami
 * bor yoki u ko'p qatorli uzun matn. Odam savol berayotganda raqam
 * yozmaydi — raqam yozilgan bo'lsa, u ma'lumot ULASHYAPTI.
 */
const PHONE_RE = /(?:\+?998[\s\-()]*)?(?:\(?\d{2}\)?[\s\-]*)\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/g;

export function countPhoneNumbers(text: string): number {
  return (text.match(PHONE_RE) || []).length;
}

export function isInformationalPost(text: string): boolean {
  if (countPhoneNumbers(text) >= 2) return true;
  const lines = text.split('\n').filter((l) => l.trim()).length;
  return lines >= 6 && text.length > 250;
}
