import { stripLandmarkSuffixes, normalizeDistrictLandmark } from './dictionary';

describe('Dictionary Suffix & Landmark Utilities', () => {
  it('should strip positional suffixes correctly', () => {
    expect(stripLandmarkSuffixes('karzinka oldida')).toBe('karzinka');
    expect(stripLandmarkSuffixes('bozor orqasida')).toBe('bozor');
    expect(stripLandmarkSuffixes('корзинка возле')).toBe('корзинка');
  });

  it('should normalize district patterns to canonical form', () => {
    expect(normalizeDistrictLandmark('3-mavze')).toBe('3-mavze');
    expect(normalizeDistrictLandmark('3 mavze')).toBe('3-mavze');
    expect(normalizeDistrictLandmark('uchinchi mavze')).toBe('3-mavze');
  });
});
