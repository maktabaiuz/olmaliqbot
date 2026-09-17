import { normalizeText } from '../transliteration';

/**
 * Ish e'lonimi — ya'ni kimdir O'ZIGA ISHCHI/YORDAMCHI YOLLAMOQCHIMI.
 *
 * MUHIM (2026-09, real skrinshot bilan tasdiqlangan JIDDIY xato): guruhlarda
 * juda keng tarqalgan xabar turi — "Shlakablok terishga podsobnik yordamchi
 * kerak ... 779758180". Bu BIZNING katalogimizga UMUMAN aloqasi yo'q:
 * katalogda usta/do'kon/muassasa bor, ya'ni odam UYIGA chaqiradigan xizmat.
 * Ish e'loni esa TESKARI yo'nalish — ish beruvchi O'ZIGA xodim qidiryapti
 * va odatda O'Z telefon raqamini qoldiradi.
 *
 * Avval bu tur umuman tanilmasdi: AI uni "SERVICE / yordamchi" deb baholab
 * (0.92 ishonch bilan!), bot esa mutlaqo aloqasiz "Kafelchi" kartochkasini
 * yuborib qo'ygan — foydalanuvchilar botdan norozi bo'lishiga sabab bo'lgan.
 *
 * Farqlovchi belgi — SO'RALAYOTGAN NARSA: "santexnik/kafelchi/usta kerak"
 * ANIQ KASB (katalogdan topiladi), "podsobnik/ishchi/mardikor/yordamchi
 * kerak" esa UMUMIY ISHCHI KUCHI (katalogda bunday narsa yo'q va bo'lmaydi).
 */
const LABOR_NOUNS =
  /\b(podsobnik|podsobnigi|podsobnich|ishchi|ishchilar|ishchilarni|mardikor|mardikorlar|yordamchi|yordamchilar|rabochiy|raznorabochiy|gruzchik|yuk tashuvchi|ofitsiant|ofitsant|sotuvchi|sotuvchilar)\b/;

const EMPLOYMENT_MARKERS =
  /\b(oylik|oyligi|maosh|maoshi|ish haqi|ish xaqi|kunlik ish|smena|smenaga|vakansiya|ishga olinadi|ishga kerak|ishga taklif|ish beriladi)\b/;

const NEED_WORDS = /\b(kerak|kere|kk|izlayapman|izlanmoqda|qidiryapman)\b/;

export function isJobVacancy(text: string): boolean {
  const n = normalizeText(text);
  if (!n) return false;

  // "podsobnik kerak", "ishchi kerak", "yordamchi kerak"
  if (LABOR_NOUNS.test(n) && NEED_WORDS.test(n)) return true;

  // "oylik", "smena", "vakansiya" kabi ish munosabati belgilari
  if (EMPLOYMENT_MARKERS.test(n) && NEED_WORDS.test(n)) return true;

  return false;
}
