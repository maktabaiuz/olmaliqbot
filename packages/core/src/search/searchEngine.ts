import { db } from '@kimbor/db';

export interface SearchOptions {
  cityId: string;
  categoryName?: string | null;
  landmarkName?: string | null;
  limit?: number;
}

export interface FormattedListingResult {
  listingId: string;
  formattedText: string;
  hasMore: boolean;
  totalMatches: number;
}

/**
 * Core Search and Recommendation Engine for "Kim bor?"
 * Strictly scoped by cityId.
 */
export async function searchListings(options: SearchOptions): Promise<FormattedListingResult | null> {
  const { cityId, categoryName, landmarkName, limit = 1 } = options;

  if (!cityId) return null;

  // 1. Find matching category in DB or fallback by name
  let categoryId: string | undefined = undefined;
  let categoryDisplayName = categoryName || 'Xizmat';

  if (categoryName) {
    const cat = await db.category.findFirst({
      where: {
        OR: [
          { name: { equals: categoryName, mode: 'insensitive' } },
          { synonyms: { has: categoryName.toLowerCase() } },
        ],
      },
    });

    if (cat) {
      categoryId = cat.id;
      categoryDisplayName = cat.name;
    }
  }

  // 2. Query active listings for the specified city
  const whereCondition: any = {
    cityId,
    status: 'ACTIVE',
  };

  if (categoryId) {
    whereCondition.categoryId = categoryId;
  }

  const candidateListings = await db.listing.findMany({
    where: whereCondition,
    include: {
      category: true,
      primaryLandmark: true,
    },
  });

  if (candidateListings.length === 0) {
    return null;
  }

  // 3. Score and rank candidates
  // Score = (Verification * 100) + (BayesianRating * 0.5) + (ThumbsCount * 0.2) + Rotation Factor
  const scoredListings = candidateListings.map((item) => {
    const isVerifiedBonus = item.verification === 'VERIFIED' ? 100 : 0;
    const ratingScore = (item.bayesianRating || 3.0) * 0.5;
    const countScore = item.thumbsUpCount * 0.2;
    // Rotation for unrated new listings
    const rotationBonus = item.thumbsUpCount === 0 ? Math.random() * 5 : 0;

    const totalScore = isVerifiedBonus + ratingScore + countScore + rotationBonus;

    return {
      listing: item,
      score: totalScore,
    };
  });

  scoredListings.sort((a, b) => b.score - a.score);

  const topMatches = scoredListings.map((s) => s.listing);
  const bestMatch = topMatches[0];

  // 4. Format response string according to TZ section 3.5
  const verifiedBadge = bestMatch.verification === 'VERIFIED' ? '✅' : '⚠️';
  const ratingText = `⭐${bestMatch.bayesianRating.toFixed(1)}`;
  const landmarkText = bestMatch.primaryLandmark ? bestMatch.primaryLandmark.name : landmarkName || '';
  const badgesText = bestMatch.badges.length > 0 ? bestMatch.badges.join(' · ') : '';

  let formattedText = `🔧 ${categoryDisplayName}\n\n`;
  formattedText += `${bestMatch.name} ${verifiedBadge} ${ratingText}\n`;
  if (landmarkText) formattedText += `📍 ${landmarkText}\n`;
  if (badgesText) formattedText += `🏷 ${badgesText}\n`;
  formattedText += `📞 ${bestMatch.phone}`;

  return {
    listingId: bestMatch.id,
    formattedText,
    hasMore: topMatches.length > limit,
    totalMatches: topMatches.length,
  };
}
