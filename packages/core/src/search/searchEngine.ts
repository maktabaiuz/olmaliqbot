import { db } from '@kimbor/db';
import { stripLandmarkSuffixes } from '../dictionary';
import { calculateBayesianRating } from '../index';

export interface SearchOptions {
  cityId: string;
  categoryName?: string | null;
  landmarkName?: string | null;
  badgeFilter?: string[] | null;
  limit?: number;
}

export interface FormattedListingResult {
  listingId: string;
  formattedText: string;
  hasMore: boolean;
  totalMatches: number;
  executionTimeMs: number;
  listing: any;
}

/**
 * Core Search & Ranking Engine for "Kim bor?"
 * Strictly scoped by cityId.
 */
export async function searchListings(options: SearchOptions): Promise<FormattedListingResult | null> {
  const startTime = Date.now();
  const { cityId, categoryName, landmarkName, badgeFilter, limit = 1 } = options;

  if (!cityId) return null;
  if (!categoryName && !landmarkName) return null;

  // Query ACTIVE listings strictly scoped by cityId
  const whereCondition: any = {
    cityId,
    status: 'ACTIVE',
  };

  // 1. Category Matching (Name or Synonyms or Direct Listing search)
  let categoryDisplayName = categoryName || 'Xizmat';

  if (categoryName) {
    const cleanCat = categoryName.trim().toLowerCase();
    const categories = await db.category.findMany({
      where: {
        OR: [
          { name: { contains: cleanCat, mode: 'insensitive' } },
          { synonyms: { has: cleanCat } },
        ],
      },
    });

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

  const candidateListings = await db.listing.findMany({
    where: whereCondition,
    include: {
      category: true,
      primaryLandmark: true,
      serviceAreaLandmarks: true,
      reviews: true,
    },
  });

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

    const totalScore =
      isVerifiedBonus +
      jargonBonus +
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

  const topMatches = scoredListings.map((s) => s.listing);
  const bestMatch = topMatches[0];
  const bestBayesianRating = scoredListings[0].bayesianRating;

  // 5. Rich Group Response Format
  const verifiedBadge = bestMatch.verification === 'VERIFIED' ? '✅ Tasdiqlangan' : '⚠️ Sinovda';
  const ratingText = `⭐ ${bestBayesianRating.toFixed(1)}`;
  const landmarkText = bestMatch.primaryLandmark ? bestMatch.primaryLandmark.name : landmarkName || '';
  
  // Pretty format badges (e.g. uyga_boradi -> Uyga boradi)
  const badgesText = Array.isArray(bestMatch.badges) && bestMatch.badges.length > 0
    ? bestMatch.badges.map((b: string) => b.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(' · ')
    : '';

  let formattedText = `🔧 **${categoryDisplayName.toUpperCase()}**\n\n`;
  formattedText += `👤 **${bestMatch.name}** | ${verifiedBadge} (${ratingText})\n`;
  if (landmarkText) formattedText += `📍 **Manzil / Mo'ljal:** ${landmarkText}\n`;
  if (bestMatch.workFrom && bestMatch.workTo) formattedText += `🕒 **Ish vaqti:** ${bestMatch.workFrom} — ${bestMatch.workTo}\n`;
  if (bestMatch.specificServices) formattedText += `🛠 **Xizmatlar:** ${bestMatch.specificServices}\n`;
  if (bestMatch.approxPrice) formattedText += `💵 **Narxi:** ${bestMatch.approxPrice}\n`;
  if (badgesText) formattedText += `🏷 **Xususiyatlar:** ${badgesText}\n`;
  if (Array.isArray(bestMatch.jargonSynonyms) && bestMatch.jargonSynonyms.length > 0) {
    formattedText += `💬 **Xalq atamalari:** ${bestMatch.jargonSynonyms.map((j: string) => '#' + j.trim()).join(' ')}\n`;
  }
  formattedText += `\n📞 **Telefon:** \`${bestMatch.phone}\``;

  const executionTimeMs = Date.now() - startTime;

  return {
    listingId: bestMatch.id,
    formattedText,
    hasMore: topMatches.length > limit,
    totalMatches: topMatches.length,
    executionTimeMs,
    listing: bestMatch,
  };
}
