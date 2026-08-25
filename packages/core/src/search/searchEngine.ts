import { db } from '@kimbor/db';
import { stripLandmarkSuffixes } from '../dictionary';
import { calculateBayesianRating } from '../index';
import { normalizeText } from '../transliteration';

// Telegram HTML parse_mode uchun xavfsiz escape (ma'lumot bazasidan kelgan
// matnda <, >, & belgilari bo'lsa xabar yuborilmay qolishining oldini oladi)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface SearchOptions {
  cityId: string;
  categoryName?: string | null;
  landmarkName?: string | null;
  badgeFilter?: string[] | null;
  /** Foydalanuvchining asl xabari — jargon so'zlarni to'g'ridan-to'g'ri qidirish uchun (AI klassifikator xato/vaqt tugashi holatida ham topish uchun). */
  rawMessage?: string | null;
}

const MIN_JARGON_PHRASE_LENGTH = 4;

// Kategoriyada o'ziga xos emoji topilmasa, turi bo'yicha umumiy belgi ishlatiladi
const DEFAULT_EMOJI_BY_OBJECT_TYPE: Record<string, string> = {
  USTA: '🔧',
  DOKON_OBYEKT: '🏪',
  MUASSASA: '🏢',
  TRANSPORT: '🚗',
};

// --- Yozilish xatolariga (typo) chidamli kategoriya moslashtirish ---
// Foydalanuvchi "avtoelektirik" deb yozsa-yu, bazada "Avtoelektrik" deb
// saqlangan bo'lsa, oddiy "contains" qidiruv topa olmaydi (bitta ortiqcha
// harf butun so'zni buzadi). Levenshtein masofasi orqali "yetarlicha yaqin"
// so'zlarni ham moslashtiramiz.
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Xabar matnidan qidiruv "nomzod"larini ajratib oladi: har bir so'z, va
// qo'shni 2 so'zning bo'shliqsiz birikmasi ("avto elektrik" -> "avtoelektrik")
// — shu orqali so'z ajratilgan yoki qo'shib yozilgan variantlarning farqi
// muammo bo'lmaydi.
function extractFuzzyCandidates(text: string): string[] {
  const words = normalizeText(text).replace(/[-']/g, '').split(/\s+/).filter((w) => w.length >= 3);
  const candidates = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    candidates.add(words[i]);
    if (i + 1 < words.length) candidates.add(words[i] + words[i + 1]);
  }
  return Array.from(candidates);
}

/**
 * Bazadagi BARCHA kategoriyalar (nomi + sinonimlari) bilan xabar matnini
 * solishtirib, yozilish xatosi bo'lsa ham eng yaqin mosini topadi.
 * Faqat aniq ("contains") qidiruv hech narsa topmagandagina chaqiriladi.
 */
async function fuzzyFindCategory(searchText: string): Promise<{ id: string; name: string }[]> {
  const candidates = extractFuzzyCandidates(searchText);
  if (candidates.length === 0) return [];

  const allCategories = await db.category.findMany({ select: { id: true, name: true, synonyms: true } });

  // Uzunroq (batafsilroq) nomzod har doim ustuvor — masalan "avto elektrik"
  // so'zlaridan yasalgan "aftoelektirik" nomzodi "Avtoelektrik"ka mos kelsa,
  // shu g'olib chiqishi kerak, qisqagina "elektirik" so'zi umumiy
  // "Elektrik" kategoriyasiga tasodifan yaqinroq bo'lib qolgan taqdirda ham —
  // to'liqroq mos kelish har doim aniqroq signal.
  let best: { id: string; name: string; distance: number; candLength: number } | null = null;
  for (const cat of allCategories) {
    const targets = [cat.name, ...cat.synonyms]
      .map((s) => normalizeText(s).replace(/[\s'-]+/g, ''))
      .filter((t) => t.length >= 4);

    for (const target of targets) {
      for (const cand of candidates) {
        if (Math.abs(target.length - cand.length) > 3) continue;
        const dist = levenshteinDistance(cand, target);
        const threshold = Math.max(1, Math.floor(target.length / 6)); // ~6 harfga 1 ta xato ruxsat
        if (dist > threshold) continue;
        const isBetter =
          !best || cand.length > best.candLength || (cand.length === best.candLength && dist < best.distance);
        if (isBetter) {
          best = { id: cat.id, name: cat.name, distance: dist, candLength: cand.length };
        }
      }
    }
  }

  return best ? [{ id: best.id, name: best.name }] : [];
}

export interface FormattedListingResult {
  listingId: string;
  formattedText: string;
  /** Yulduzcha (Bayesian rating) bo'yicha saralangan, 1-7 ketma-ketlikda kompakt ro'yxat — "Yana ko'rish" tugmasi bosilganda ko'rsatiladi. */
  rankedListText: string;
  hasMore: boolean;
  totalMatches: number;
  executionTimeMs: number;
  listing: any;
}

const MAX_RANKED_RESULTS = 7;
const RANK_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];

function formatRankedLine(item: any, rank: number, bayesianRating: number): string {
  const verifiedIcon = item.verification === 'VERIFIED' ? '✅' : '⚠️';
  const landmarkText = item.primaryLandmark?.name || '';
  const rankLabel = RANK_EMOJI[rank - 1] || `${rank}.`;
  const landmarkPart = landmarkText ? ` · 📍 ${escapeHtml(landmarkText)}` : '';
  return `${rankLabel} <b>${escapeHtml(item.name)}</b> ${verifiedIcon} ⭐${bayesianRating.toFixed(1)}${landmarkPart}\n     📞 <code>${escapeHtml(item.phone)}</code>`;
}

/**
 * Core Search & Ranking Engine for "Kim bor?"
 * Strictly scoped by cityId.
 */
export async function searchListings(options: SearchOptions): Promise<FormattedListingResult | null> {
  const startTime = Date.now();
  const { cityId, categoryName, landmarkName, badgeFilter, rawMessage } = options;

  if (!cityId) return null;
  if (!categoryName && !landmarkName && !rawMessage) return null;

  // 0. Jargon so'zni to'g'ridan-to'g'ri xabar matnidan qidirish. Admin bazaga
  // qo'shganda odamlar shu narsani qanday so'rashini oldindan yozib qo'ygan
  // bo'ladi (masalan "oydindagi evosni nomeri") — shu orqali AI klassifikator
  // (Gemini) vaqtinchalik ishlamay qolsa yoki noaniq kategoriya chiqarsa ham,
  // bot admin bilgan aniq iborani xabar ichidan topib, javobni yo'qotmaydi.
  let jargonMatchedIds = new Set<string>();
  if (rawMessage) {
    const normalizedMsg = normalizeText(rawMessage);
    const jargonCandidates = await db.listing.findMany({
      where: { cityId, status: 'ACTIVE', jargonSynonyms: { isEmpty: false } },
      select: { id: true, jargonSynonyms: true },
    });
    for (const cand of jargonCandidates) {
      const hit = cand.jargonSynonyms.some((j) => {
        const cleanJargon = normalizeText(j);
        return cleanJargon.length >= MIN_JARGON_PHRASE_LENGTH && normalizedMsg.includes(cleanJargon);
      });
      if (hit) jargonMatchedIds.add(cand.id);
    }
  }

  // Query ACTIVE listings strictly scoped by cityId
  const whereCondition: any = {
    cityId,
    status: 'ACTIVE',
  };

  // 1. Category Matching (Name or Synonyms or Direct Listing search)
  let categoryDisplayName = categoryName || 'Xizmat';

  if (categoryName) {
    const cleanCat = categoryName.trim().toLowerCase();
    let categories = await db.category.findMany({
      where: {
        OR: [
          { name: { contains: cleanCat, mode: 'insensitive' } },
          { synonyms: { has: cleanCat } },
        ],
      },
    });

    // Aniq moslik topilmasa — yozilish xatosiga chidamli qidiruvga o'tamiz
    // (masalan "avtoelektirik" -> "Avtoelektrik"). Xabar matni ham
    // qo'shiladi, chunki klassifikator ba'zan kategoriyani asl matndan
    // to'liq ajrata olmaydi.
    if (categories.length === 0) {
      const fuzzyMatches = await fuzzyFindCategory(`${cleanCat} ${rawMessage || ''}`);
      if (fuzzyMatches.length > 0) {
        categories = fuzzyMatches as any;
      }
    }

    if (categories.length > 0) {
      const categoryIds = categories.map((c) => c.id);
      whereCondition.categoryId = { in: categoryIds };
      categoryDisplayName = categories[0].name;
    } else {
      // If Category table didn't match directly, search Listing name, jargonSynonyms, or specificServices
      whereCondition.OR = [
        { name: { contains: cleanCat, mode: 'insensitive' } },
        { jargonSynonyms: { has: cleanCat } },
        { specificServices: { contains: cleanCat, mode: 'insensitive' } },
      ];
    }
  }

  // 2. Landmark Matching with Suffix Stripping ("karzinka oldida" -> "karzinka")
  let cleanLandmarkName: string | null = null;
  let matchedLandmarkIds: string[] = [];

  if (landmarkName) {
    cleanLandmarkName = stripLandmarkSuffixes(landmarkName).toLowerCase();
    const landmarks = await db.landmark.findMany({
      where: {
        cityId,
        OR: [
          { name: { equals: cleanLandmarkName, mode: 'insensitive' } },
          { synonyms: { has: cleanLandmarkName } },
        ],
      },
    });

    matchedLandmarkIds = landmarks.map((l) => l.id);
  }

  // Landmark, Service Area & Jargon Synonyms Matching
  if (matchedLandmarkIds.length > 0 || cleanLandmarkName) {
    const landmarkOrConditions: any[] = [];
    if (matchedLandmarkIds.length > 0) {
      landmarkOrConditions.push({ primaryLandmarkId: { in: matchedLandmarkIds } });
      landmarkOrConditions.push({ serviceAreaLandmarks: { some: { id: { in: matchedLandmarkIds } } } });
    }
    if (cleanLandmarkName) {
      landmarkOrConditions.push({ jargonSynonyms: { has: cleanLandmarkName } });
    }
    
    if (whereCondition.OR) {
      // Combine with existing category/text OR condition
      whereCondition.AND = [
        { OR: whereCondition.OR },
        { OR: landmarkOrConditions }
      ];
      delete whereCondition.OR;
    } else {
      whereCondition.OR = landmarkOrConditions;
    }
  }

  // Badge Filtering
  if (badgeFilter && badgeFilter.length > 0) {
    whereCondition.badges = { hasEvery: badgeFilter };
  }

  let candidateListings = await db.listing.findMany({
    where: whereCondition,
    include: {
      category: true,
      primaryLandmark: true,
      serviceAreaLandmarks: true,
      reviews: true,
    },
  });

  // Agar categoryName/landmarkName umuman berilmagan bo'lsa (faqat rawMessage
  // orqali jargon qidiruvi bo'lgan holat), whereCondition hali ham shahar
  // bo'yicha CHEKSIZ ro'yxatni qaytaradi — bunday holatda faqat jargon so'z
  // orqali aniq topilgan yozuvlar bilan cheklaymiz.
  if (!categoryName && !landmarkName) {
    candidateListings = candidateListings.filter((l) => jargonMatchedIds.has(l.id));
  }

  // Jargon orqali topilgan, lekin structured (kategoriya/mo'ljal) filtrga
  // to'g'ri kelmagani uchun natijaga tushmagan yozuvlarni ham qo'shib qo'yamiz —
  // admin qo'shgan aniq ibora har doim ustuvor topilishi kerak.
  const candidateIds = new Set(candidateListings.map((l) => l.id));
  const missingJargonIds = [...jargonMatchedIds].filter((id) => !candidateIds.has(id));
  if (missingJargonIds.length > 0) {
    const extraJargonListings = await db.listing.findMany({
      where: { id: { in: missingJargonIds }, cityId, status: 'ACTIVE' },
      include: {
        category: true,
        primaryLandmark: true,
        serviceAreaLandmarks: true,
        reviews: true,
      },
    });
    candidateListings = [...candidateListings, ...extraJargonListings];
  }

  if (candidateListings.length === 0) {
    return null;
  }

  // 4. Ranking Formula:
  // Score = BaseVerification + (BayesianRating * 0.5) + (ReviewCount * 0.2) + (RecencyScore * 0.15) + (CompletenessScore * 0.15) + RotationBonus
  const scoredListings = candidateListings.map((item) => {
    const isVerifiedBonus = item.verification === 'VERIFIED' ? 1000 : 0;

    // Recalculate Bayesian Rating dynamically
    const thumbsUp = item.reviews.filter((r) => r.isPositive).length || item.thumbsUpCount;
    const thumbsDown = item.reviews.filter((r) => !r.isPositive).length || item.thumbsDownCount;
    const bayesianRating = calculateBayesianRating(thumbsUp, thumbsDown);
    const reviewCount = thumbsUp + thumbsDown;

    const ratingScore = bayesianRating * 0.5;
    const countScore = reviewCount * 0.2;

    // Recency score (days since last verification)
    const daysSinceVerified = Math.max(0, (Date.now() - new Date(item.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = daysSinceVerified <= 30 ? 1.0 : Math.max(0.1, 1.0 - (daysSinceVerified - 30) * 0.01);

    const completenessScore = (item.completenessScore || 50) / 100;

    // Rotation bonus for unrated new listings (0 reviews) so they get discovered
    const rotationBonus = reviewCount === 0 ? Math.random() * 3 : 0;

    // Jargon match bonus (+500 score) so exact local jargon matches rank first
    const hasJargonMatch = cleanLandmarkName && item.jargonSynonyms?.some((j) => j.toLowerCase().includes(cleanLandmarkName.toLowerCase()));
    const jargonBonus = hasJargonMatch ? 500 : 0;

    // Xabar matnida admin qo'shgan jargon ibora to'g'ridan-to'g'ri topilgan
    // bo'lsa — bu eng aniq signal, hatto tasdiqlanganlik holatidan ham
    // ustunroq bo'lishi kerak (AI klassifikator xato/vaqt tugagan bo'lsa ham).
    const directJargonBonus = jargonMatchedIds.has(item.id) ? 2000 : 0;

    const totalScore =
      isVerifiedBonus +
      jargonBonus +
      directJargonBonus +
      ratingScore +
      countScore +
      recencyScore * 0.15 +
      completenessScore * 0.15 +
      rotationBonus;

    return {
      listing: item,
      bayesianRating,
      reviewCount,
      score: totalScore,
    };
  });

  scoredListings.sort((a, b) => b.score - a.score);

  // Yulduzcha (Bayesian rating) bo'yicha eng yaxshi 7 tasi — 1-7 ketma-ketlikda "Yana ko'rish"ga chiqadi
  const rankedTop = scoredListings.slice(0, MAX_RANKED_RESULTS);
  const topMatches = rankedTop.map((s) => s.listing);
  const bestMatch = topMatches[0];
  const bestBayesianRating = rankedTop[0].bayesianRating;

  // Sarlavhada har doim TOPILGAN yozuvning haqiqiy kategoriyasini ko'rsatamiz —
  // klassifikator taxminini emas (masalan Gemini ishlamay qolib, chalkash matn
  // chiqargan bo'lsa ham, foydalanuvchiga toza va to'g'ri nom ko'rinadi).
  categoryDisplayName = bestMatch.category?.name || categoryDisplayName;

  // Kategoriyaga mos ikonka (masalan santexnik -> 🚿, taksi -> 🚕) — har bir
  // javob bir xil umumiy 🔧 belgisi bilan emas, aynan shu kasbga mos ko'rinadi.
  // Kategoriyada o'ziga xos emoji bo'lmasa (masalan admin qo'lda qo'shgan yangi
  // kategoriya), turi (Usta/Do'kon/Muassasa/Transport) bo'yicha umumiy belgi ishlatiladi.
  const categoryEmoji = bestMatch.category?.emoji || DEFAULT_EMOJI_BY_OBJECT_TYPE[bestMatch.category?.objectType || ''] || '🔧';

  // 5. Qisqa, toza guruh javobi (Telegram HTML parse_mode) — TZ §3.5 namunasiga mos:
  // ikonka + qiymat, ortiqcha yorliqlarsiz. "Xalq atamalari" faqat qidiruv uchun,
  // foydalanuvchiga ko'rsatilmaydi.
  const verifiedIcon = bestMatch.verification === 'VERIFIED' ? '✅' : '⚠️';
  const landmarkText = bestMatch.primaryLandmark ? bestMatch.primaryLandmark.name : landmarkName || '';

  // Belgilarni chiroyli ko'rinishga keltirish (masalan uyga_boradi -> Uyga boradi)
  const badgesText = Array.isArray(bestMatch.badges) && bestMatch.badges.length > 0
    ? bestMatch.badges.map((b: string) => b.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(' · ')
    : '';

  const lines: string[] = [];
  lines.push(`${categoryEmoji} <b>${escapeHtml(categoryDisplayName)}</b>`);
  lines.push('');
  lines.push(`<b>${escapeHtml(bestMatch.name)}</b> ${verifiedIcon} ⭐${bestBayesianRating.toFixed(1)}`);
  if (landmarkText) lines.push(`📍 ${escapeHtml(landmarkText)}`);
  if (bestMatch.workFrom && bestMatch.workTo) lines.push(`🕐 ${bestMatch.workFrom}–${bestMatch.workTo}`);
  if (badgesText) lines.push(`🏷 ${escapeHtml(badgesText)}`);
  if (bestMatch.specificServices) lines.push(`🛠 ${escapeHtml(bestMatch.specificServices)}`);
  if (bestMatch.approxPrice) lines.push(`💵 ${escapeHtml(bestMatch.approxPrice)}`);
  lines.push('');
  lines.push(`📞 <code>${escapeHtml(bestMatch.phone)}</code>`);

  const formattedText = lines.join('\n');

  // Kompakt 1-7 ranked ro'yxat ("Yana ko'rish" tugmasi bosilganda ko'rsatiladi)
  const rankedListText =
    `${categoryEmoji} <b>${escapeHtml(categoryDisplayName)}</b> — top ${rankedTop.length} ta:\n\n` +
    rankedTop.map((s, i) => formatRankedLine(s.listing, i + 1, s.bayesianRating)).join('\n\n');

  const executionTimeMs = Date.now() - startTime;

  return {
    listingId: bestMatch.id,
    formattedText,
    rankedListText,
    hasMore: scoredListings.length > 1,
    totalMatches: rankedTop.length,
    executionTimeMs,
    listing: bestMatch,
  };
}
