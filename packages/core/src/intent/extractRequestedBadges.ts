import { normalizeText } from '../transliteration';

/**
 * Foydalanuvchi xabaridan "Belgilar" (badges) bo'limida admin belgilagan
 * xususiyatlarni ("Kafolat", "24/7", "Karta" va h.k.) so'raganini aniqlaydi.
 *
 * MUHIM: bu qattiq FILTR emas — natijasi faqat REYTING BONUSI sifatida
 * ishlatiladi (qarang: searchEngine.ts `badgeBonus`). Ya'ni agar hech
 * qaysi yozuvda so'ralgan belgi bo'lmasa ham, qidiruv BO'SH qaytmaydi —
 * shunchaki belgiga ega yozuv(lar) ustunlik bilan birinchi chiqadi.
 * Qattiq filtr xavfli bo'lardi: admin ko'pincha haqiqatda kafolat
 * bergan bo'lsa ham, formada shunchaki belgini bosishni unutib qo'yishi
 * mumkin — shunday holatda bot noto'g'ri "topilmadi" deb javob berib
 * qo'yishi mumkin edi.
 *
 * Har bir qoida ATAYLAB ANIQ, kam uchraydigan iboralarga qurilgan
 * (masalan "karta" so'zining o'zi emas, "karta bilan" iborasi) — aks
 * holda tasodifiy so'z ustma-tushishi noto'g'ri belgini "so'ralgan" deb
 * belgilab, aloqasiz yozuvni tepaga chiqarib yuborishi mumkin edi.
 */
export function extractRequestedBadges(rawMessage: string): string[] {
  const n = normalizeText(rawMessage);
  if (!n) return [];

  const found = new Set<string>();

  if (/\buyga (boradi|keladi|chaqir\w*|olib boradi)\b/.test(n) || /\buyga boradigan\b/.test(n)) {
    found.add('Uyga boradi');
  }
  if (/\bkafolat/.test(n)) {
    found.add('Kafolat');
  }
  if (/\b24\s*\/?\s*7\b/.test(n) || /\bkecha[\s-]?kunduz\b/.test(n) || /\btunu[\s-]?kun\b/.test(n) || /\b24 soat\b/.test(n)) {
    found.add('24/7');
  }
  if (/\bkarta (bilan|orqali|qabul)\b/.test(n) || /\bkartaga\b/.test(n) || /\bplastik karta\b/.test(n)) {
    found.add('Karta');
  }
  if (/\bzudlik bilan\b/.test(n) || /\bshoshilinch\b/.test(n) || /\btezda kerak\b/.test(n)) {
    found.add('Zudlik');
  }
  if (/\bruscha\b/.test(n) || /\brus tilida\b/.test(n) || /русск/.test(rawMessage)) {
    found.add('Ruscha');
  }

  // Zapravka yoqilg'i turlari — nisbatan aniq, kam uchraydigan atamalar
  // (oktan raqami), shuning uchun yolg'on-musbat xavfi past.
  if (/\bmetan\b/.test(n)) found.add('Metan');
  if (/\bpropan\b/.test(n)) found.add('Propan');
  if (/\bai[\s-]?80\b/.test(n)) found.add('AI-80');
  if (/\bai[\s-]?91\b/.test(n)) found.add('AI-91');
  if (/\bai[\s-]?92\b/.test(n)) found.add('AI-92');
  if (/\bai[\s-]?95\b/.test(n)) found.add('AI-95');
  if (/\bdizel\b/.test(n)) found.add('Dizel');

  return Array.from(found);
}
