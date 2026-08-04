// Core utility functions for Bayesian rating calculation, normalization, etc.

export * from './prompts';
export * from './emergency';
export * from './dictionary';
export * from './search';
export * from './transliteration';
export * from './requests/queryLoop';

export function calculateBayesianRating(thumbsUp: number, thumbsDown: number, globalAvg: number = 3.0, m: number = 5): number {
  const total = thumbsUp + thumbsDown;
  if (total === 0) return globalAvg;
  
  // Convert thumbs ratio to 5-star scale
  const positiveRatio = thumbsUp / total;
  const rawScore = positiveRatio * 5.0;
  
  // Bayesian average formula: (v * R + m * C) / (v + m)
  const score = (total * rawScore + m * globalAvg) / (total + m);
  return Math.round(score * 10) / 10;
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
