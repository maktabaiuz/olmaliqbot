/**
 * Converts Uzbek Cyrillic text to normalized Uzbek Latin text.
 */
export declare function cyrillicToLatin(text: string): string;
/**
 * Normalizes Uzbek/Russian input text into lowercase Latin representation for matching.
 */
export declare function normalizeText(text: string): string;
/**
 * Generates 3-script index forms: Latin, Cyrillic, and normalized text.
 */
export declare function indexThreeScripts(text: string): {
    latin: string;
    cyrillic: string;
    normalized: string;
};
//# sourceMappingURL=index.d.ts.map