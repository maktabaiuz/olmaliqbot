import { db } from '@kimbor/db';
import { normalizeText } from '../transliteration';

// MUHIM (2026-09, AI-bog'lashning ikkinchi bosqichi): butun sessiya
// davomida "to'ytepa/beshbир/vayonqamat" uslubidagi ko'plab xato AI'ning
// "landmark" maydoni bizning haqiqiy mo'ljallar ro'yxatini KO'RMASLIGIDAN
// kelib chiqqan edi — AI ba'zan kirill-lotin aralash buzuq matn, ba'zan
// oddiy raqamni ("3") noto'g'ri mo'ljal deb talqin qilgan.
//
// Kategoriyadan FARQLI o'laroq, "landmark" QATTIQ RO'YXAT (enum) bilan
// cheklanmaydi — chunki foydalanuvchi bizda RO'YXATDAN O'TMAGAN joyni
// ham aytishi mumkin (bu holatda qidiruv to'g'ri ravishda "topilmadi"
// deb JIM turadi, bu — kutilgan, to'g'ri xulq-atvor). Buning o'rniga
// haqiqiy mo'ljallar ro'yxati AI'ga "ma'lumot beruvchi" kontekst
// sifatida beriladi — AI bilgan joyni TO'G'RI yozishga yordam beradi,
// lekin yangi/bizda yo'q joyni aytish erkinligini cheklamaydi.
const landmarkContextCache = new Map<string, { names: string[]; expiresAt: number }>();

/**
 * Shu shahardagi haqiqiy mo'ljallar nomlarini (rasmiy nom + eng ko'p
 * ishlatiladigan 1-2 ta xalq nomi) qaytaradi — AI klassifikator
 * promptiga kontekst sifatida qo'shish uchun. Shaharga xos, 10
 * daqiqaga keshlanadi.
 */
export async function getRealLandmarkNames(cityId: string): Promise<string[]> {
  const cached = landmarkContextCache.get(cityId);
  if (cached && cached.expiresAt > Date.now()) return cached.names;

  const landmarks = await db.landmark.findMany({
    where: { cityId },
    select: { name: true, synonyms: true },
  });

  // (2026-10-06) Har bir MFY — barcha mahalliy jargonlari bilan (avtomatik
  // qo'shilgan "X mahalla/mfy" shakllari bundan mustasno). Avval faqat
  // birinchi 2 sinonim berilardi — admin kiritgan "korzinka", "5/1" kabi
  // jargonlar AI'ga umuman yetib bormasdi.
  const names = landmarks
    .filter((l) => l.name !== 'MFY tanlanmagan')
    .map((l) => {
      const base = normalizeText(l.name.replace(/\s*MFY$/i, ''));
      const jargon = Array.from(new Set(l.synonyms.map((x) => normalizeText(x))))
        .filter((x) => x && x !== base && !/(mahalla|mahallasi|mfy)$/.test(x) && x !== base.replace(/'/g, ''))
        .slice(0, 15);
      return jargon.length ? `${l.name} (= ${jargon.join(', ')})` : l.name;
    })
    .sort();

  landmarkContextCache.set(cityId, { names, expiresAt: Date.now() + 60_000 }); // jargonlar deyarli jonli yangilansin
  return names;
}

// MUHIM (2026-09, "Manzillar" tizimini tozalash chog'ida topilgan): AI
// klassifikatorning "landmark" maydoni ba'zan bekorchi qiymat qaytaradi —
// bo'sh javob o'rniga harfiy "none"/"null"/"not_relevant" satri, yoki
// aniq mo'ljal o'rniga shaharning O'ZI nomi ("Olmaliq" — bu mo'ljal emas,
// butun shahar). Bunday qiymatlar QueryLog'da 1000+ marta "manzil"
// sifatida saqlanib, keyinchalik real foydalanish tahlilini (masalan bu
// yozuvdagi kabi haqiqiy mo'ljal qidiruvi) chalg'itardi. Bu FAQAT log
// tozaligi uchun — botning haqiqiy qidiruv xatti-harakatiga ta'sir
// qilmaydi (searchListings hali ham xom `classification.landmark`ni emas,
// shu sanitizatsiyadan o'tgan qiymatni oladi, lekin ikkalasi ham bir xil
// natijaga olib keladi, chunki "none"/"Olmaliq" baribir hech qanday real
// mo'ljalga mos kelmasdi).
const NON_LANDMARK_SENTINEL_VALUES = new Set(['none', 'null', 'not_relevant', 'n/a', 'yo\'q', 'yoq']);

export function sanitizeAiLandmarkName(landmark: string | null | undefined, cityName?: string): string | null {
  if (!landmark) return null;
  const normalized = normalizeText(landmark).trim();
  if (!normalized) return null;
  if (NON_LANDMARK_SENTINEL_VALUES.has(normalized)) return null;
  if (cityName && normalized === normalizeText(cityName)) return null;
  return landmark;
}
