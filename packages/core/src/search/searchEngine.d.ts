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
export declare function searchListings(options: SearchOptions): Promise<FormattedListingResult | null>;
//# sourceMappingURL=searchEngine.d.ts.map