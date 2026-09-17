import { normalizeText } from '../transliteration';

/**
 * "Gaz qachon beriladi", "svet qachon keladi" kabi KOMMUNAL XIZMAT holati
 * haqidagi jamoat savoli — bu USTA/XIZMAT SO'ROVI EMAS.
 *
 * MUHIM (2026-09, real skrinshot bilan tasdiqlangan xato): "Акалар газ
 * качон беришидан хабарилар борми?" ("Aka-uka, gaz qachon berilishi
 * haqida xabar bormi?" — mahallada gaz uzilgani haqida gap ketyapti,
 * odamlar tiklanish vaqtini so'rayapti) so'roviga AI "HOURS" intent va
 * category="gaz" deb xato chiqardi, bot esa aloqasiz gaz ustasi
 * (Sardor)ning kontaktini yuborib yubordi. AI buni "gazavik nechada
 * ishlaydi" (biznes ish vaqti so'rovi) bilan adashtirgan — garchi
 * ma'nosi BUTUNLAY BOSHQA: bu YAGONA kommunal RESURS (gaz/svet/suv/
 * internet)ning UZILISHI/TIKLANISHI haqida, hech qanday ustaga
 * murojaat qilinmayapti.
 *
 * Farqlovchi belgi: "qachon beriladi/keladi" + resurs so'zi (gaz, svet,
 * elektr, suv, internet) — bular XIZMAT KO'RSATUVCHI KASB so'zlari
 * ("gazavik", "elektrik", "santexnik") EMAS, balki resursning O'ZI.
 * Haqiqiy xizmat so'rovi kasb nomini ("santexnik kerak") yoki aniq
 * harakatni ("gaz ustasi kerak") ishlatadi, resursni yolg'iz o'zini
 * "qachon" bilan emas.
 */
const UTILITY_RESOURCE_WORDS = /\b(gaz|svet|elektr|suv|internet)\b/;
// MUHIM: kirillcha "к" harfi lotinlashtirilganda "q" emas "k" bo'lib
// chiqadi ("качон" -> "kachon"), shu sabab ikkala shakl ham tekshiriladi.
const RESTORE_VERB_PATTERN = /\b[qk]achon\w*\s+\w*(beri|kel)/;

export function isUtilityStatusQuestion(text: string): boolean {
  const n = normalizeText(text);
  if (!n) return false;
  return UTILITY_RESOURCE_WORDS.test(n) && RESTORE_VERB_PATTERN.test(n);
}
