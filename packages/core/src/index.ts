// Core utility functions for Bayesian rating calculation, normalization, etc.

export * from './prompts';
export * from './emergency';
export * from './botMessages/botMessageStore';
export * from './dictionary';
export * from './search';
export * from './transliteration';
export * from './intent/isSelfOffer';
export * from './intent/isJobVacancy';
export * from './intent/isUtilityStatusQuestion';
export * from './intent/extractRequestedBadges';
export * from './intent/extractRentalFilters';
export * from './money';
export * from './requests/queryLoop';
export * from './moderation/moderationFilter';
export * from './filter/zeroLayerFilter';
export * from './filter/aiClassifier';

/**
 * Yagona reyting formulasi (Bayes o'rtachasi, 1–5 shkala). 2026-10-08:
 * avval ikki xil formula bor edi — saqlanadigan reyting 👎=1 ball, yangi=4.0;
 * qidiruv saralashi esa 👎=0 ball (1–5 shkaladan tashqari), yangi=3.0.
 * Endi hammasi shu funksiyadan: 👍=5, 👎=1, yangi yozuv = 3.0 (neytral).
 */
export function calculateBayesianRating(thumbsUp: number, thumbsDown: number, prior: number = 3.0, weight: number = 5): number {
  const total = thumbsUp + thumbsDown;
  if (total === 0) return prior;
  const sum = thumbsUp * 5 + thumbsDown * 1;
  return Math.round(((weight * prior + sum) / (weight + total)) * 10) / 10;
}

export function normalizeWordVariants(input: string): { latin: string; cyrillic: string } {
  // Utility for mapping Uzbek Latin <-> Cyrillic
  // Simple baseline mapping
  const clean = input.trim().toLowerCase();
  return {
    latin: clean,
    cyrillic: clean,
  };
}
