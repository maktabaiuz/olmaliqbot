import { zeroLayerFilter } from './zeroLayerFilter';
import { fallbackRuleClassification } from './aiClassifier';
import { isSelfOffer } from '@kimbor/core';
import { IntentType } from '@kimbor/types';

describe('0-QAVAT: Kalit so\'z va Pattern filtri (0-Layer Filter)', () => {
  it('1. So\'roq belgisi (?) va kasb bo\'lganda o\'tishi kerak', () => {
    expect(zeroLayerFilter('karzinka oldida gazavik bormi?')).toBe(true);
    expect(zeroLayerFilter('карзинка олдида газовик борми?')).toBe(true);
  });

  it("2. So'roq so'zlari va kasb bo'lganda o'tishi kerak", () => {
    expect(zeroLayerFilter('Bahrom degan kafelchi nomeri kerak edi')).toBe(true);
    expect(zeroLayerFilter('нужен сантехник срочно 3 мавзе')).toBe(true);
  });

  it("3. Favqulodda kalit so'zlari bo'lganda srazi o'tishi kerak (so'roq belgisiz ham)", () => {
    expect(zeroLayerFilter('uyda gaz hidi kelyapti nima qilay')).toBe(true);
    expect(zeroLayerFilter('пожар в доме срочно')).toBe(true);
    expect(zeroLayerFilter('одамни ток урди')).toBe(true);
  });

  it('4. Oddiy guruh suhbatlarini 90% bloklashi kerak', () => {
    expect(zeroLayerFilter('assalomu alaykum hammaga yaxshimisizlar')).toBe(false);
    expect(zeroLayerFilter('ertaga futbol o\'ynaymizmi guys')).toBe(false);
    expect(zeroLayerFilter('rahmat aka yaxshi yetib oling')).toBe(false);
    expect(zeroLayerFilter('bugun ob-havo juda issiq bo\'ldi')).toBe(false);
    expect(zeroLayerFilter('salom')).toBe(false);
  });
});

describe('1-QAVAT: 35 ta Real Savol Misolida AI Klassifikator Sinovi', () => {
  // --- EMERGENCY SCENARIOS (Favqulodda holatlar) ---
  const emergencyCases = [
    { text: 'uyda gaz hidi kelyapti nima qilay', name: 'Gaz hidi (Lotin)' },
    { text: 'газ пахнет в квартире срочно', name: 'Gaz hidi (Rus)' },
    { text: 'уйда газ иси келяпти', name: 'Gaz hidi (Kirill)' },
    { text: 'уйда олов ёнди пожар', name: 'Yong\'in (Aralash)' },
    { text: 'электр ток урди одамни', name: 'Elektr urishi' },
    { text: 'одам хушидан кетди йиқилиб', name: 'Hushidan ketish' },
    { text: 'сильно порезался кровь не останавливается', name: 'Qon ketish' },
    { text: 'машина сбила человека авария', name: 'Avariya / YTH' },
    { text: 'ребенок потерялся срочно помогите', name: 'Bola yo\'qoldi' },
  ];

  emergencyCases.forEach(({ text, name }) => {
    it(`🚨 Favqulodda holat: ${name} -> EMERGENCY & confidence >= 0.9`, () => {
      const res = fallbackRuleClassification(text.toLowerCase(), text);
      expect(res.intent).toBe(IntentType.EMERGENCY);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  // --- SERVICE & CONTACT INTENTS (O'zbek lotin, Kirill, Rus va Aralash) ---
  it('10. karzinka oldida gazavik bormi? -> SERVICE, gazavik, karzinka', () => {
    const res = fallbackRuleClassification('karzinka oldida gazavik bormi?', 'karzinka oldida gazavik bormi?');
    expect(res.intent).toBe(IntentType.SERVICE);
    expect(res.category).toBe('gazavik');
    expect(res.landmark).toBe('karzinka');
    expect(res.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('11. карзинка олдидаги дукон нечигача ишлайди -> HOURS, karzinka', () => {
    const res = fallbackRuleClassification('карзинка олдидаги дукон нечигача ишлайди', 'карзинка олдидаги дукон нечигача ишлайди');
    expect(res.intent).toBe(IntentType.HOURS);
    expect(res.landmark).toBe('karzinka');
  });

  it('12. сантехник нужен срочно 3 мавзе -> SERVICE, santexnik, 3-mavze', () => {
    const res = fallbackRuleClassification('сантехник нужен срочно 3 мавзе', 'сантехник нужен срочно 3 мавзе');
    expect(res.intent).toBe(IntentType.SERVICE);
    expect(res.category).toBe('santexnik');
    expect(res.landmark).toBe('3-mavze');
  });

  it('13. Bahromni nomeri nechi edi -> CONTACT, Bahrom', () => {
    const res = fallbackRuleClassification('bahromni nomeri nechi edi', 'Bahromni nomeri nechi edi');
    expect(res.intent).toBe(IntentType.CONTACT);
    expect(res.name).toBe('Bahrom');
  });

  it('14. kafel yotqizadigan usta kerak bozor orqasida -> SERVICE, kafelchi, bozor', () => {
    const res = fallbackRuleClassification('kafel yotqizadigan usta kerak bozor orqasida', 'kafel yotqizadigan usta kerak bozor orqasida');
    expect(res.intent).toBe(IntentType.SERVICE);
    expect(res.category).toBe('kafelchi');
    expect(res.landmark).toBe('bozor');
  });

  it('15. notarius qayerda joylashgan -> LOCATION, notarius', () => {
    const res = fallbackRuleClassification('notarius qayerda joylashgan', 'notarius qayerda joylashgan');
    expect(res.intent).toBe(IntentType.LOCATION);
    expect(res.category).toBe('notarius');
  });

  it('16. konditsioner o\'rnatish qanchaga tushadi -> PRICE', () => {
    const res = fallbackRuleClassification('konditsioner o\'rnatish qanchaga tushadi', 'konditsioner o\'rnatish qanchaga tushadi');
    expect(res.intent).toBe(IntentType.PRICE);
  });

  it('17. 24 soat ochiq dorixona bormi bozor yonda -> SERVICE, dorixona, bozor', () => {
    const res = fallbackRuleClassification('24 soat ochiq dorixona bormi bozor yonda', '24 soat ochiq dorixona bormi bozor yonda');
    expect(res.intent).toBe(IntentType.SERVICE);
    expect(res.category).toBe('dorixona');
    expect(res.landmark).toBe('bozor');
  });

  it('18. такси нужен до ташкента -> SERVICE, taksi', () => {
    const res = fallbackRuleClassification('такси нужен до ташкента', 'такси нужен до ташкента');
    expect(res.intent).toBe(IntentType.SERVICE);
    expect(res.category).toBe('taksi');
  });

  it('19. электрик борми свет ўчди -> SERVICE, elektrik', () => {
    const res = fallbackRuleClassification('электрик борми свет ўчди', 'электрик борми свет ўчди');
    expect(res.intent).toBe(IntentType.SERVICE);
    expect(res.category).toBe('elektrik');
  });

  it('20. Aziz degan kafelchini telefoni bormi -> CONTACT, Aziz', () => {
    const res = fallbackRuleClassification('aziz degan kafelchini telefoni bormi', 'Aziz degan kafelchini telefoni bormi');
    expect(res.intent).toBe(IntentType.CONTACT);
    expect(res.name).toBe('Aziz');
  });

  // --- NON-RELEVANT & LOW CONFIDENCE SCENARIOS ---
  it('21. assalomu alaykum hammaga -> NOT_RELEVANT, confidence < 0.7', () => {
    const res = fallbackRuleClassification('assalomu alaykum hammaga', 'assalomu alaykum hammaga');
    expect(res.confidence).toBeLessThan(0.7);
  });

  it('22. kim bor? -> NOT_RELEVANT, confidence < 0.7 (bot stays silent)', () => {
    const res = fallbackRuleClassification('kim bor?', 'kim bor?');
    expect(res.confidence).toBeLessThan(0.7);
  });

  it('23. aka o\'sha odamni raqamini tashlang -> confidence < 0.7', () => {
    const res = fallbackRuleClassification('aka o\'sha odamni raqamini tashlang', 'aka o\'sha odamni raqamini tashlang');
    expect(res.confidence).toBeLessThan(0.7);
  });
});

describe("E'lon vs so'rov (labo va umuman)", () => {
  it('menga labo kerak / lobo bormi — so\'rov', () => {
    expect(isSelfOffer('menga labo kerak')).toBe(false);
    expect(isSelfOffer('lobo bormi')).toBe(false);
    expect(isSelfOffer('labo nomeri kerak')).toBe(false);
    const a = fallbackRuleClassification('menga labo kerak', 'menga labo kerak');
    expect(a.intent).toBe(IntentType.SERVICE);
    const b = fallbackRuleClassification('lobo bormi', 'lobo bormi');
    expect(b.intent).toBe(IntentType.SERVICE);
  });

  it('menda labo bor / yo\'lga chiqaman — e\'lon', () => {
    expect(isSelfOffer('menda labo bor ish bolsa')).toBe(true);
    expect(isSelfOffer('ertalab laboda yolga chiqaman kimda yuk bor')).toBe(true);
    expect(isSelfOffer('menda taksi bor ish bolsa')).toBe(true);
    const a = fallbackRuleClassification('menda labo bor ish bolsa', 'menda labo bor ish bolsa');
    expect(a.intent).toBe(IntentType.NOT_RELEVANT);
    const b = fallbackRuleClassification(
      'ertalab laboda yolga chiqaman kimda yuk bor',
      'ertalab laboda yolga chiqaman kimda yuk bor'
    );
    expect(b.intent).toBe(IntentType.NOT_RELEVANT);
  });
});
