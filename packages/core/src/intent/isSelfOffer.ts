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

  // Birinchi shaxsda o'z xizmatini reklama qilish: "elektrika ishlarini
  // qilamiz", "santexnika xizmatlarini ko'rsatamiz", "eshikni tuzataman" +
  // odatda telefon raqami bilan. Bu haqiqiy so'rov ("elektrik kerak") bilan
  // deyarli bir xil so'zlardan iborat, faqat fe'l shaxsi farq qiladi —
  // "qilamiz/bajaramiz" (biz/men qilamiz) doim taklif, "kerak/bormi" doim so'rov.
  //
  // MUHIM (2026-09 topilgan xato): "olaman" ("metall olaman" — mahalliy
  // metall-yig'uvchi "sizdan metall SOTIB OLAMAN" degan e'lon shakli)
  // ro'yxatda yo'q edi — natijada bu bitta so'z ham qidiruv, ham taklif
  // ma'nosida ishlatilishi mumkinligi sabab (masalan "usta olib kelaman"
  // kabi neytral holatlar bilan farqlanmasdan) e'lon SIFATIDA emas, SO'ROV
  // sifatida ko'rilib, bot xato ravishda mavjud "metalchi" (temirchi/usta)
  // yozuvlarini ko'rsatib yuborardi.
  if (/\b(qilamiz|bajaramiz|ko'?rsatamiz|tuzatamiz|o'?rnatamiz|qilaman|bajaraman|tuzataman|o'?rnataman|olaman|olamiz)\b/.test(n)) {
    return true;
  }

  // "X sotaman/sotiladi/beriladi" — o'zbek tilida e'lon berishning ENG
  // KENG TARQALGAN shakli, ko'pincha "menda" so'zisiz ("Kvartiram bor
  // sotiladi", "Kvartira sotaman", "1 xonali kvartira sotiladi
  // shoshilinch") — avval faqat "menda ... bor" talab qilinardi, bu
  // ko'plab haqiqiy e'lonlarni o'tkazib yuborar edi (production'da
  // tasdiqlangan xato). isClearSeek yuqorida allaqachon narx savoli
  // ("qancha sotiladi?") kabi holatlarni himoya qiladi.
  if (/\b(sotaman|sotamiz|sotiladi|sotilmoqda)\b/.test(n)) return true;
  if (/\b(beriladi|beraman|beramiz)\b/.test(n) && /\b(arenda|ijara)/.test(n)) return true;

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

function hasVehicleHint(n: string): boolean {
  return /\b(labo|lobo|taksi|damas|starex|porter|gazel|gazelle|mashina|laboda|loboda|taksida)\b/.test(
    n
  );
}
