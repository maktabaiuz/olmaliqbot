export interface CategorySeed {
    id: string;
    name: string;
    synonyms: string[];
    object_type: string;
}
export interface LandmarkSeed {
    official_name: string;
    folk_names: string[];
}
export declare const INITIAL_DICTIONARY: {
    categories: {
        id: string;
        name: string;
        synonyms: string[];
        object_type: string;
    }[];
    olmaliq_landmarks: {
        official_name: string;
        folk_names: string[];
    }[];
    suffixes: string[];
    question_words: string[];
};
/**
 * Strips Uzbek/Russian positional suffixes from landmark phrases
 * (e.g. "karzinka oldi" -> "karzinka", "корзинка возле" -> "корзинка")
 */
export declare function stripLandmarkSuffixes(text: string): string;
/**
 * Normalizes numbered district patterns
 * (e.g. "3-mavze", "3 mavze", "uchinchi mavze" -> "3-mavze")
 */
export declare function normalizeDistrictLandmark(text: string): string;
//# sourceMappingURL=dictionary.d.ts.map