"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dictionary_1 = require("./dictionary");
describe('Dictionary Suffix & Landmark Utilities', () => {
    it('should strip positional suffixes correctly', () => {
        expect((0, dictionary_1.stripLandmarkSuffixes)('karzinka oldida')).toBe('karzinka');
        expect((0, dictionary_1.stripLandmarkSuffixes)('bozor orqasida')).toBe('bozor');
        expect((0, dictionary_1.stripLandmarkSuffixes)('корзинка возле')).toBe('корзинка');
    });
    it('should normalize district patterns to canonical form', () => {
        expect((0, dictionary_1.normalizeDistrictLandmark)('3-mavze')).toBe('3-mavze');
        expect((0, dictionary_1.normalizeDistrictLandmark)('3 mavze')).toBe('3-mavze');
        expect((0, dictionary_1.normalizeDistrictLandmark)('uchinchi mavze')).toBe('3-mavze');
    });
});
//# sourceMappingURL=dictionary.test.js.map