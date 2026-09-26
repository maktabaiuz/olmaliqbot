import { describe, it, expect } from 'vitest';
import { contentTokensOf, computeJargonTokenFrequency, phraseLevelJargonStrength, normalizeText } from '@kimbor/core';

const city = ['olmaliq'];
// Kategoriya lug'atidagi so'zlar (soha so'zlari) — 1 = bitta kategoriyaga xos.
const catFreq = new Map<string, number>([['kompyuter', 1], ['mahala', 1], ['taksi', 1], ['gazavik', 1]]);

const listings = [
  { jargonSynonyms: ['uyni remont qiladigan usta kerak', 'remont qiladigan usta'] }, // Bekzod (bo'yoqchi)
  { jargonSynonyms: ['usta remont qiladigan yaxshi', 'yaxshi usta bormi'] },          // Ismoil (kafelchi)
  { jargonSynonyms: ['beshbirdagi karvon zaprafka'] },
  { jargonSynonyms: ['baliq haus nomeri kerak'] },
  { jargonSynonyms: ['olmaliq mib'] },
  { jargonSynonyms: ['deska mahala nomeri kerak'] },
];
const tokenFreq = computeJargonTokenFrequency(listings);

function strengthFor(msg: string, jargon: string) {
  const msgContent = contentTokensOf(msg, city);
  return phraseLevelJargonStrength(msgContent, jargon, tokenFreq, catFreq, city);
}

describe('Jargon ibora darajasidagi moslik — umumiy so\'zlar hech qachon "kuchli" dalil bermaydi', () => {
  const generic = [
    'Assalomu alaykum akalar qayerda kompyuter noutbook remont qiladigan usta bor',
    'Уйдаги газ плитани ремонт киладиган усталар номери кимда бор ёзиб юборинглар илтимос',
    'Assalomu alaykum akalar yaxshimisizlar sunnat qiladigan yaxshi duxtir bormi',
  ];
  for (const msg of generic) {
    it(`bo'yoqchi/kafelchi jargoni bilan mos KELMAYDI: ${msg.slice(0, 40)}`, () => {
      expect(strengthFor(msg, 'uyni remont qiladigan usta kerak')).toBeNull();
      expect(strengthFor(msg, 'remont qiladigan usta')).toBeNull();
      expect(strengthFor(msg, 'usta remont qiladigan yaxshi')).toBeNull();
      expect(strengthFor(msg, 'yaxshi usta bormi')).toBeNull();
    });
  }
});

describe('Jargon ibora darajasidagi moslik — haqiqiy atoqli nomlar hali ham ishlaydi', () => {
  it('qisman xabar (o\'ziga xos so\'z bor)', () => {
    expect(strengthFor('Beshbirdagi zaprafka ochiqmi', 'beshbirdagi karvon zaprafka')).toBe('strong');
  });
  it('bo\'shliq imlosi farqi', () => {
    expect(strengthFor('Baliqhaus bormi', 'baliq haus nomeri kerak')).toBe('strong');
  });
  it('qisqa nom + shahar nomi', () => {
    expect(strengthFor('Olmaliq mib nechigacha ishlaydi', 'olmaliq mib')).toBe('strong');
  });
  it('foydalanuvchi qisqaroq yozgan', () => {
    expect(strengthFor('Haus nomeri', 'baliq haus nomeri kerak')).toBe('strong');
  });
  it('bir xil nomdagi boshqa soha (mahala) — to\'liq qoplanmasa, teskari yo\'nalish orqali ham faqat nom so\'zi bo\'yicha', () => {
    expect(strengthFor('deska zaprafka ishlayabdimi', 'deska mahala nomeri kerak')).toBe('strong');
  });
  it('aloqasiz xabar', () => {
    expect(strengthFor('salom qalaysiz akalar', 'baliq haus nomeri kerak')).toBeNull();
  });
});

describe('contentTokensOf', () => {
  it('umumiy so\'zlarni olib tashlaydi', () => {
    expect(contentTokensOf('remont qiladigan usta kerak', city)).toEqual([]);
    expect(normalizeText('Kompyuter')).toBe('kompyuter');
    expect(contentTokensOf('kompyuter noutbook remont', city)).toContain('kompyuter');
  });
});
