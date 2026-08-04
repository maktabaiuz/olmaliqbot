"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_DICTIONARY = void 0;
exports.stripLandmarkSuffixes = stripLandmarkSuffixes;
exports.normalizeDistrictLandmark = normalizeDistrictLandmark;
const initialDictionary_json_1 = __importDefault(require("./initialDictionary.json"));
exports.INITIAL_DICTIONARY = initialDictionary_json_1.default;
/**
 * Strips Uzbek/Russian positional suffixes from landmark phrases
 * (e.g. "karzinka oldi" -> "karzinka", "корзинка возле" -> "корзинка")
 */
function stripLandmarkSuffixes(text) {
    if (!text)
        return '';
    let cleaned = text.trim().toLowerCase();
    for (const suffix of initialDictionary_json_1.default.suffixes) {
        const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|\\s+)${escaped}(?:$|\\s+)`, 'gi');
        cleaned = cleaned.replace(regex, ' ');
    }
    return cleaned.trim();
}
/**
 * Normalizes numbered district patterns
 * (e.g. "3-mavze", "3 mavze", "uchinchi mavze" -> "3-mavze")
 */
function normalizeDistrictLandmark(text) {
    const lower = text.toLowerCase().trim();
    if (/(3\s*-?\s*mavze|uchinchi\s*mavze|третий\s*микрорайон)/i.test(lower)) {
        return '3-mavze';
    }
    return lower;
}
//# sourceMappingURL=dictionary.js.map