import { db } from '@kimbor/db';
import { contentTokensOf, getCityNameWords, getCategoryVocabulary, getLandmarkVocabulary } from './searchEngine';

// 2026-09-28, "Mahalliy so'zlar" — LIVE rejim (foydalanuvchi aniq so'radi:
// "hozirdan boshlab, har bitta user yozganini o'qib, live rejimda saqlab
// yursin"). Bu fayl guruhdan kelgan HAR BIR haqiqiy so'rov xabarini (AI
// klassifikatsiyasidan keyin, kategoriya/mo'ljal allaqachon aniqlangan
// paytda) darhol o'qib, hali lug'atda yo'q so'zlarni doimiy o'suvchi
// (persistent) hisobga qo'shib boradi — avvalgi versiyada bu faqat admin
// ekranni ochganda, so'nggi 5000 xabarni qayta skanerlash orqali
// hisoblanardi. Botning javob berish tezligiga (3 soniyadan kam, AGENTS.md)
// TA'SIR QILMASLIGI uchun chaqiruvchi tomonda HAR DOIM fire-and-forget
// (await qilinmasdan, .catch() bilan) chaqirilishi SHART.

const GREETING_POLITENESS_WORDS = new Set([
  'assalom', 'assalomu', 'alaykum', 'alekum', 'aleykum', 'alaykumassalom',
  'salom', 'rahmat', 'raxmat', 'iltimos', 'oldindan', 'hurmatli', 'hammaga',
  'akalar', 'ukalar', 'opalar', 'bolalar', 'birodarlar', 'aylanay',
]);

// Bitta so'z uchun cheksiz "skelet" saqlamaslik uchun chegara — 30 ta
// TURLI xabar-shakli allaqachon "bu so'z ko'p xil kontekstda ishlatiladi"
// degan xulosa uchun yetarlicha dalil, keyingisini kuzatishning ma'nosi yo'q.
const MAX_SKELETONS_TRACKED = 30;

export async function recordLearnedTermCandidates(
  cityId: string,
  rawMessage: string,
  categoryName: string | null,
  landmarkName: string | null
): Promise<void> {
  if (!cityId || !rawMessage) return;

  const [cityWords, categoryVocab, landmarkVocab] = await Promise.all([
    getCityNameWords(cityId),
    getCategoryVocabulary(),
    getLandmarkVocabulary(cityId),
  ]);

  const tokens = contentTokensOf(rawMessage, cityWords);
  if (tokens.length === 0) return;
  const skeleton = [...new Set(tokens)].sort().join('|');

  const seen = new Set<string>();
  for (const t of tokens) {
    if (t.length < 5) continue; // juda qisqa so'zlar tasodifiy shovqin
    if (/\d{4,}/.test(t)) continue; // telefon raqami/kod — so'z emas
    if (categoryVocab.has(t) || landmarkVocab.has(t)) continue; // ALLAQACHON bazada bor
    if (GREETING_POLITENESS_WORDS.has(t)) continue; // salomlashuv, joy/biznes nomi emas
    if (seen.has(t)) continue; // bitta xabar bitta so'zni bir marta "ovoz" bersin
    seen.add(t);

    try {
      const existing = await db.learnedTermAggregate.findUnique({ where: { cityId_term: { cityId, term: t } } });
      // Admin allaqachon qaror qabul qilgan (qo'shgan yoki rad etgan) —
      // qayta kuzatishning hojati yo'q.
      if (existing && existing.status !== 'PENDING') continue;

      const skeletonsSeen: string[] = Array.isArray(existing?.skeletonsSeen) ? (existing!.skeletonsSeen as string[]) : [];
      const isNewSkeleton = !skeletonsSeen.includes(skeleton);
      const updatedSkeletons =
        isNewSkeleton && skeletonsSeen.length < MAX_SKELETONS_TRACKED ? [...skeletonsSeen, skeleton] : skeletonsSeen;

      const categoryVotes: Record<string, number> =
        existing && typeof existing.categoryVotes === 'object' && existing.categoryVotes !== null
          ? { ...(existing.categoryVotes as Record<string, number>) }
          : {};
      if (categoryName) categoryVotes[categoryName] = (categoryVotes[categoryName] || 0) + 1;

      const landmarkVotes: Record<string, number> =
        existing && typeof existing.landmarkVotes === 'object' && existing.landmarkVotes !== null
          ? { ...(existing.landmarkVotes as Record<string, number>) }
          : {};
      if (landmarkName) landmarkVotes[landmarkName] = (landmarkVotes[landmarkName] || 0) + 1;

      await db.learnedTermAggregate.upsert({
        where: { cityId_term: { cityId, term: t } },
        create: {
          cityId,
          term: t,
          distinctSkeletonCount: 1,
          skeletonsSeen: [skeleton],
          sampleMessage: rawMessage,
          categoryVotes,
          landmarkVotes,
        },
        update: {
          ...(isNewSkeleton ? { distinctSkeletonCount: { increment: 1 } } : {}),
          skeletonsSeen: updatedSkeletons,
          categoryVotes,
          landmarkVotes,
          lastSeenAt: new Date(),
        },
      });
    } catch (err) {
      // Fon vazifasi — bitta so'z uchun xato butun xabarni to'xtatmasin.
      console.error(`Failed to record learned term "${t}":`, err);
    }
  }
}
