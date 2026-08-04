export * from './prompts';
export * from './emergency';
export * from './dictionary';
export * from './search';
export * from './transliteration';
export * from './requests/queryLoop';
export declare function calculateBayesianRating(thumbsUp: number, thumbsDown: number, globalAvg?: number, m?: number): number;
export declare function normalizeWordVariants(input: string): {
    latin: string;
    cyrillic: string;
};
//# sourceMappingURL=index.d.ts.map