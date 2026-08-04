import { zeroLayerFilter } from './zeroLayerFilter';
import { fallbackRuleClassification } from './aiClassifier';
import { normalizeText } from '@kimbor/core';
import { IntentType } from '@kimbor/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(description: string, condition: boolean, details: string = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description} ${details}`);
  }
}

console.log('\n======================================================');
console.log('🧪 2-BOSHQICH: BOT YADROSI & KLASSIFIKATOR TESTLARI');
console.log('======================================================\n');

console.log('--- 1. 0-Qavat Kalit So\'z va Pattern Filtr Sinovi ---');

assert(
  'karzinka oldida gazavik bormi? -> 0-Layer PASS',
  zeroLayerFilter('karzinka oldida gazavik bormi?') === true
);

assert(
  'карзинка олдида газовик борми? -> 0-Layer PASS (Kirill)',
  zeroLayerFilter('карзинка олдида газовик борми?') === true
);

assert(
  'Bahrom degan kafelchi nomeri kerak edi -> 0-Layer PASS',
  zeroLayerFilter('Bahrom degan kafelchi nomeri kerak edi') === true
);

assert(
  'нужен сантехник срочно 3 мавзе -> 0-Layer PASS (Rus)',
  zeroLayerFilter('нужен сантехник срочно 3 мавзе') === true
);

assert(
  'uyda gaz hidi kelyapti nima qilay -> 0-Layer PASS (Emergency)',
  zeroLayerFilter('uyda gaz hidi kelyapti nima qilay') === true
);

assert(
  'assalomu alaykum hammaga yaxshimisizlar -> 0-Layer BLOCK',
  zeroLayerFilter('assalomu alaykum hammaga yaxshimisizlar') === false
);

assert(
  'ertaga futbol o\'ynaymizmi guys -> 0-Layer BLOCK',
  zeroLayerFilter('ertaga futbol o\'ynaymizmi guys') === false
);

assert(
  'rahmat aka yaxshi yetib oling -> 0-Layer BLOCK',
  zeroLayerFilter('rahmat aka yaxshi yetib oling') === false
);


console.log('\n--- 2. 🚨 Favqulodda Holatlar (Emergency Scenarios) ---');

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
  const res = fallbackRuleClassification(normalizeText(text), text);
  assert(
    `🚨 ${name} -> EMERGENCY & confidence >= 0.9`,
    res.intent === IntentType.EMERGENCY && res.confidence >= 0.9,
    `Got intent: ${res.intent}, confidence: ${res.confidence}`
  );
});


console.log('\n--- 3. 1-Qavat AI Klassifikator 35 Ta Real Savol Sinovi ---');

const serviceCases = [
  {
    text: 'karzinka oldida gazavik bormi?',
    expectedIntent: IntentType.SERVICE,
    expectedCategory: 'gazavik',
    expectedLandmark: 'karzinka',
  },
  {
    text: 'карзинка олдидаги дукон нечигача ишлайди',
    expectedIntent: IntentType.HOURS,
    expectedLandmark: 'karzinka',
  },
  {
    text: 'сантехник нужен срочно 3 мавзе',
    expectedIntent: IntentType.SERVICE,
    expectedCategory: 'santexnik',
    expectedLandmark: '3-mavze',
  },
  {
    text: 'Bahromni nomeri nechi edi',
    expectedIntent: IntentType.CONTACT,
    expectedName: 'Bahrom',
  },
  {
    text: 'kafel yotqizadigan usta kerak bozor orqasida',
    expectedIntent: IntentType.SERVICE,
    expectedCategory: 'kafelchi',
    expectedLandmark: 'bozor',
  },
  {
    text: 'notarius qayerda joylashgan',
    expectedIntent: IntentType.LOCATION,
    expectedCategory: 'notarius',
  },
  {
    text: 'konditsioner o\'rnatish qanchaga tushadi',
    expectedIntent: IntentType.PRICE,
  },
  {
    text: '24 soat ochiq dorixona bormi bozor yonda',
    expectedIntent: IntentType.SERVICE,
    expectedCategory: 'dorixona',
    expectedLandmark: 'bozor',
  },
  {
    text: 'такси нужен до ташкента',
    expectedIntent: IntentType.SERVICE,
    expectedCategory: 'taksi',
  },
  {
    text: 'электрик борми свет ўчди',
    expectedIntent: IntentType.SERVICE,
    expectedCategory: 'elektrik',
  },
  {
    text: 'Aziz degan kafelchini telefoni bormi',
    expectedIntent: IntentType.CONTACT,
    expectedName: 'Aziz',
  },
];

serviceCases.forEach((c) => {
  const res = fallbackRuleClassification(normalizeText(c.text), c.text);
  const intentOk = res.intent === c.expectedIntent;
  const categoryOk = c.expectedCategory ? res.category === c.expectedCategory : true;
  const landmarkOk = c.expectedLandmark ? res.landmark === c.expectedLandmark : true;
  const nameOk = c.expectedName ? res.name === c.expectedName : true;
  const confOk = res.confidence >= 0.7;

  assert(
    `Savol: "${c.text}" -> Intent: ${c.expectedIntent}`,
    intentOk && categoryOk && landmarkOk && nameOk && confOk,
    `Res: ${JSON.stringify(res)}`
  );
});


console.log('\n--- 4. Kam Ishonch (Confidence < 0.7) & Bot Jim Turishi ---');

const lowConfCases = [
  'assalomu alaykum hammaga',
  'kim bor?',
  'aka o\'sha odamni raqamini tashlang',
];

lowConfCases.forEach((text) => {
  const res = fallbackRuleClassification(normalizeText(text), text);
  assert(
    `Patsiz so'rov: "${text}" -> confidence < 0.7`,
    res.confidence < 0.7,
    `Confidence: ${res.confidence}`
  );
});

console.log('\n======================================================');
console.log(`📊 TEST YAKUNI: Jami: ${totalTests} | ✅ O'tdi: ${passedTests} | ❌ Xato: ${failedTests}`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
