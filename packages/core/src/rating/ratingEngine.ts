import { db } from '@kimbor/db';

/**
 * Bayesian Average Rating Formula
 * Bayesian Rating = (C * m + S) / (C + n)
 * Where:
 *   C = Confidence weight (e.g. 5 pseudo-reviews)
 *   m = Prior mean rating (e.g. 4.0 out of 5.0)
 *   S = Total score sum of actual ratings
 *   n = Total number of actual ratings
 */
export function calculateBayesianAverage(thumbsUp: number, thumbsDown: number): number {
  const totalReviews = thumbsUp + thumbsDown;
  if (totalReviews === 0) return 4.0; // Default prior mean rating for new providers

  const C = 5; // Pseudo-reviews weight
  const m = 4.0; // Population mean rating

  // Each 👍 is 5.0 points, each 👎 is 1.0 point
  const actualScoreSum = thumbsUp * 5.0 + thumbsDown * 1.0;
  const bayesianRating = (C * m + actualScoreSum) / (C + totalReviews);

  return Math.round(bayesianRating * 10) / 10;
}

export interface RatingInput {
  cityId: string;
  listingId: string;
  telegramUserId: bigint;
  isPositive: boolean;
  comment?: string;
}

export interface RatingResult {
  success: boolean;
  message: string;
  newRating?: number;
  anomalousAlert?: boolean;
}

/**
 * Submits a rating for a listing with strict single-vote enforcement & anomaly detection
 */
export async function submitProviderRating(input: RatingInput): Promise<RatingResult> {
  const { cityId, listingId, telegramUserId, isPositive, comment } = input;

  // 1. Single Vote Constraint Check
  const existingReview = await db.review.findFirst({
    where: {
      listingId,
      telegramUserId,
    },
  });

  if (existingReview) {
    return {
      success: false,
      message: "❌ RAD ETILDI: Siz ushbu usta uchun allaqachon baho bergansiz! Bir foydalanuvchi faqat 1 marta baho bera oladi.",
    };
  }

  // 2. Record Review in Database
  await db.review.create({
    data: {
      listingId,
      telegramUserId,
      isPositive,
      comment,
    },
  });

  // 3. Fetch all reviews for this listing to calculate new Bayesian rating
  const allReviews = await db.review.findMany({
    where: { listingId },
  });

  const thumbsUp = allReviews.filter((r) => r.isPositive).length;
  const thumbsDown = allReviews.filter((r) => !r.isPositive).length;
  const newBayesianRating = calculateBayesianAverage(thumbsUp, thumbsDown);

  // 4. Update Listing Bayesian Rating & lastVerifiedAt if rating is positive (👍)
  const listingUpdateData: any = {
    bayesianRating: newBayesianRating,
    thumbsUpCount: thumbsUp,
    thumbsDownCount: thumbsDown,
  };

  if (isPositive) {
    listingUpdateData.lastVerifiedAt = new Date();
  }

  await db.listing.update({
    where: { id: listingId },
    data: listingUpdateData,
  });

  // 5. Anomaly Detection (Spike of ratings from new users within 1 hour)
  let anomalousAlert = false;
  const recentReviewsCount = await db.review.count({
    where: {
      listingId,
      createdAt: { gte: new Date(Date.now() - 3600 * 1000) },
    },
  });

  if (recentReviewsCount >= 5) {
    anomalousAlert = true;
    console.warn(`🚨 ANOMALIYA OGOHLANTIRIShI: Usta ID ${listingId} uchun 1 soat ichida ${recentReviewsCount} ta baho kirdi! Adminlarga signal yuborildi.`);
  }

  return {
    success: true,
    message: `⭐ Bahoyingiz qabul qilindi! Ustaning yangi reytingi: ${newBayesianRating}`,
    newRating: newBayesianRating,
    anomalousAlert,
  };
}
