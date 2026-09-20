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
const LANDMARK_CONTEXT_TTL_MS = 10 * 60 * 1000;
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

  const names = Array.from(
    new Set(
      landmarks.flatMap((l) => {
        const forms = [normalizeText(l.name), ...l.synonyms.slice(0, 2).map((s) => normalizeText(s))];
        return forms.filter(Boolean);
      })
    )
  ).sort();

  landmarkContextCache.set(cityId, { names, expiresAt: Date.now() + LANDMARK_CONTEXT_TTL_MS });
  return names;
}
