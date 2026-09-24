import { normalizeText } from '../transliteration';

/**
 * Guruhdagi gap so'ROVmi yoki E'LONmi.
 * So'rov: odam xizmat/transport QIDIRADI → bot javob berishi kerak.
 * E'lon: odam o'zida bor narsani TAKLIF qiladi yoki yuk/ish qidiradi → bot JIM.
 *
 * Gemini xato qilsa ham, bu qoida groupHandlerda qattiq to'xtatadi:
 * kategoriya so'zi (labo, taksi, ...) xabarda bo'lgani javob uchun yetarli emas.
 */
export function isSelfOffer(text: string): boolean {
  const n = normalizeText(text);
  if (!n) return false;

  // Aniq so'rov belgisi ustun: "menga X kerak", "X bormi", "X nomeri"
  if (isClearSeek(n)) return false;

  // MUHIM (2026-09, real skrinshot bilan tasdiqlangan xato): "Labo
  // xizmati 776880696" — o'z xizmatini taklif qilishning ENG QISQA,
  // fe'lsiz shakli (shunchaki xizmat nomi + telefon raqami, "bor"/
  // "menda"/"sotaman" kabi hech qanday belgi so'zisiz). Yuqoridagi
  // barcha qoidalar biror FE'L yoki EGALIK belgisiga tayanadi, shu
  // sabab bunday "yalang'och" e'lonni o'tkazib yuborardi — bot esa
  // buni so'rov deb qabul qilib, BAZADAGI BOSHQA (aloqasiz) yozuvni
  // ko'rsatib yuborardi. Endi: xabar QISQA (<=6 so'z), o'zbek telefon
  // raqamiga o'xshash 9 xonali (yoki 998+9 xonali) ketma-ketlik bor,
  // VA hech qanday aniq so'rov so'zi ("kerak", "bormi", "narxi" kabi)
  // yo'q bo'lsa — bu deyarli har doim o'z raqamini qoldirgan e'lon.
  if (looksLikeContactOnlyAd(n)) return true;

  if (hasFirstPersonPossession(n)) return true;
  if (/\byo'?lga chiqaman\b/.test(n)) return true;
  if (/\b(bo'sh|bosh) ketaman\b/.test(n)) return true;
  if (/\bolib ketaman\b/.test(n) && !/\bolib ketadigan\b/.test(n)) return true;
  if (/\bkimda yuk\b/.test(n)) return true;
  if (/\byuk bormi\b/.test(n) && hasVehicleHint(n)) return true;
  if (/\bish bo'?lsa\b/.test(n) && (/\bmenda\b/.test(n) || hasVehicleHint(n))) return true;
  if (/\b(menga|bizga)\s+yozing\b/.test(n)) return true;
  if (/\bkerak bo'?lsa\b/.test(n) && /\b(menga|bizga|yozing|qo'?ng'?iroq|qongiroq)\b/.test(n)) return true;
  if (/\b(menga|bizga)\s+qo'?ng'?iroq\b/.test(n)) return true;
  if (/\b(xizmat ko'?rsataman|ishlayman murojaat|murojaat qiling)\b/.test(n)) return true;

  // MUHIM (2026-09, real skrinshot bilan tasdiqlangan xato): reklama
  // e'lonlarining eng keng tarqalgan yakuni — odamni O'Z profiliga/
  // kanaliga yo'naltirish: "Kimga maklersiz Olmaliqda uy kerak bo'lsa
  // PROFILGA O'TING". Bu shakl "kerak" so'zi borligi uchun so'rovdek
  // ko'rinadi, lekin aslida sof reklama — bot bunga javob berib, mutlaqo
  // aloqasiz yozuvni ko'rsatib yuborgan edi.
  if (/\b(profilga|profilimga|akkauntga|akkauntimga|kanalimga|kanalga|bioda|biomda|havolada|linkda)\b/.test(n)) {
    return true;
  }
  if (/\b(dm|lichkaga|shaxsiyga)\s+(yozing|yozin|murojaat)\b/.test(n)) return true;

  // MUHIM (2026-09-24, "Labo usti yopiq termosbutka hizmati yuklarni
  // yetqazib beraman" — real skrinshot bilan tasdiqlangan xato): shu
  // qatorlar avval FAQAT qo'lda terilgan, reaktiv fe'l ro'yxati edi
  // (qilamiz, bajaramiz, tuzataman, sotaman...) — har safar yangi
  // skrinshotdan keyin YANA bitta so'z qo'shilardi. "Yetkazib beraman"
  // ro'yxatda yo'q edi, shu sabab o'tkazib yuborildi va bot boshqa
  // (aloqasiz) haydovchining haqiqiy raqamini chiqarib yubordi.
  //
  // Endi BUTUN grammatik klassni bitta qoida bilan qamrab olamiz:
  // o'zbek tilida "men/biz nimadir QILAMAN/QILAMIZ" (hozirgi-kelasi
  // zamon, birinchi shaxs) fe'llari deyarli doim "-aman/-ayman" (birlik)
  // yoki "-amiz/-aymiz" (ko'plik) bilan tugaydi — qilaman, bajaraman,
  // tuzataman, o'rnataman, olaman, sotaman, beraman, yetkazib beraman,
  // olib boraman, ishlayman, va h.k. — kategoriyadan qat'i nazar. Bu
  // qoliplashtirma orqali hali ro'yxatga tushmagan HAR QANDAY yangi fe'l
  // ham avtomatik qamrab olinadi, faqat ushbu bitta so'z uchun emas.
  // isClearSeek yuqorida ALLAQACHON aniq so'rov so'zlarini ("kerak",
  // "qancha", "qayerda" va h.k.) ajratib, ERTA qaytib ketgani uchun —
  // shu yergacha yetib kelgan xabarda bunday fe'l bo'lsa, deyarli har
  // doim o'z xizmatini taklif qilish (E'LON), so'rov emas.
  //
  // DIQQAT: `\w` standart regex sinfi apostrofni ("qo'yaman", "qo'shaman"
  // kabi o'zbekcha so'zlarda) so'z belgisi deb hisoblamaydi — natijada
  // "qo'yaman" ikkiga bo'linib ("qo'" + "yaman"), qoliplashma ishlamay
  // qolardi. Shu sabab bu yerda maxsus `[a-z0-9']` sinfi ishlatiladi
  // (transliteration/index.ts'dagi `isWordChar` bilan bir xil yondashuv).
  if (/\b[a-z0-9']{2,}(aman|ayman|amiz|aymiz)\b/.test(n)) return true;

  // Passiv/uchinchi shaxs e'lon shakllari — yuqoridagi qoliplashmaga
  // to'g'ri kelmaydi ("sotiladi", "beriladi" birinchi shaxs emas), shu
  // sabab alohida qoladi. "X sotiladi", "Kvartiram bor sotiladi" —
  // o'zbek tilida e'lon berishning eng keng tarqalgan shakllaridan biri.
  if (/\b(sotiladi|sotilmoqda|beriladi)\b/.test(n)) return true;

  return false;
}

function isClearSeek(n: string): boolean {
  if (/\bbormi\b/.test(n)) return true;
  if (/\b(nomeri|raqami|telefoni)\b/.test(n) && !/\bmenda\b/.test(n)) return true;
  if (/\bmenga\b/.test(n) && /\bkerak\b/.test(n) && !/\bkerak bo'?lsa\b/.test(n)) return true;
  // "qayerda" so'zining qo'shimchali shakllari ham ("qayerdan", "qayerdagi")
  // aniq so'rov belgisi — trailing \b talab qilinmaydi, aks holda masalan
  // "qayerdan olaman" kabi ODDIY savol pastdagi "olaman" (taklif) belgisi
  // bilan XATO ravishda e'lon deb hisoblanib qolar edi.
  if (/\bqayerda\w*/.test(n)) return true;
  if (/\b(narxi|qancha|nechigacha)\b/.test(n)) return true;
  if (
    /\bkimda\b/.test(n) &&
    /\b(nomeri|raqami|labo|lobo|taksi|usta|gazavik)\b/.test(n) &&
    !/\bkimda yuk\b/.test(n)
  ) {
    return true;
  }
  return false;
}

function hasFirstPersonPossession(n: string): boolean {
  if (/\bbormi\b/.test(n)) return false;
  if (!/\bbor\b/.test(n)) return false;
  if (/\bmenda\b/.test(n)) return true;

  // MUHIM (2026-09 topilgan xato): o'zbek tilida birinchi shaxs egalik
  // ("mening ... bor") ko'pincha alohida "menda" so'zisiz, faqat so'z
  // oxiridagi "-im" qo'shimchasi orqali ifodalanadi — masalan "labo
  // xizmatim bor" ("mening labo xizmatim bor" degani, "menda" so'zi
  // aytilmasa ham). Avval faqat "menda ... bor" tanilardi, shu sabab bu
  // juda tabiiy va keng tarqalgan shakl E'LON emas, SO'ROV deb xato
  // baholanib, bot mavjud (aloqasiz) yozuvlarni ko'rsatib yuborardi.
  return /\b\w+im\s+bor\b/.test(n);
}

// O'zbek mobil raqami: mahalliy 9 xonali ("776880696") yoki 998 kodi
// bilan 12 xonali ("998776880696") — ikkalasi ham shu bitta qoliplashda.
const PHONE_LIKE_PATTERN = /\b(?:998)?\d{9}\b/;
// Aniq so'rov so'zlaridan biri bo'lsa — raqam bo'lishidan qat'i nazar,
// bu SO'ROV (masalan "taksi kerak, shu raqamga yozing"), reklama emas.
const REQUEST_MARKER_RE = /\b(kerak|bormi|nomeri|raqami|telefoni|narxi|qancha|nechiga|qayerda\w*|kimda)\b/;

function looksLikeContactOnlyAd(n: string): boolean {
  if (!PHONE_LIKE_PATTERN.test(n)) return false;
  if (REQUEST_MARKER_RE.test(n)) return false;
  const wordCount = n.split(/\s+/).filter(Boolean).length;
  return wordCount <= 6;
}

function hasVehicleHint(n: string): boolean {
  return /\b(labo|lobo|taksi|damas|starex|porter|gazel|gazelle|mashina|laboda|loboda|taksida)\b/.test(
    n
  );
}
