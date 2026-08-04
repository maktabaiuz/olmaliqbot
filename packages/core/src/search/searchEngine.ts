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

  // 1. Category Matching (Name or Synonyms)
  let categoryId: string | undefined = undefined;
  let categoryDisplayName = categoryName || 'Xizmat';

  if (categoryName) {
    const cleanCat = categoryName.trim().toLowerCase();
    const cat = await db.category.findFirst({
      where: {
        OR: [
          { name: { equals: cleanCat, mode: 'insensitive' } },
          { synonyms: { has: cleanCat } },
        ],
      },
    });

    if (cat) {
      categoryId = cat.id;
      categoryDisplayName = cat.name;
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

  // 3. Query ACTIVE listings strictly scoped by cityId
  const whereCondition: any = {
    cityId,
    status: 'ACTIVE',
  };

  if (categoryId) {
    whereCondition.categoryId = categoryId;
  }

  // Landmark & Service Area Matching
  if (matchedLandmarkIds.length > 0) {
    whereCondition.OR = [
      { primaryLandmarkId: { in: matchedLandmarkIds } },
      { serviceAreaLandmarks: { some: { id: { in: matchedLandmarkIds } } } },
    ];
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

    const totalScore =
      isVerifiedBonus +
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

  // 5. Group Response Format according to TZ section 3.5
  const verifiedBadge = bestMatch.verification === 'VERIFIED' ? '✅' : '⚠️';
  const ratingText = `⭐${bestBayesianRating.toFixed(1)}`;
  const landmarkText = bestMatch.primaryLandmark ? bestMatch.primaryLandmark.name : landmarkName || '';
  
  // Pretty format badges (e.g. uyga_boradi -> Uyga boradi)
  const badgesText = bestMatch.badges.length > 0
    ? bestMatch.badges.map((b) => b.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())).join(' · ')
    : '';

  let formattedText = `🔧 ${categoryDisplayName}\n\n`;
  formattedText += `${bestMatch.name} ${verifiedBadge} ${ratingText}\n`;
  if (landmarkText) formattedText += `📍 ${landmarkText}\n`;
  if (badgesText) formattedText += `🏷 ${badgesText}\n`;
  formattedText += `📞 ${bestMatch.phone}`;

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
