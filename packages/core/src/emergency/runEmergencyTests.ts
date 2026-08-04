import { renderEmergencyTemplate } from './render';
import { EMERGENCY_TEMPLATES } from './templates';

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

function runEmergencyTests() {
  console.log('\n======================================================');
  console.log('🧪 4-BOSHQICH: FAVQULODDA MODUL & XAVFSIZLIK TESTLARI');
  console.log('======================================================\n');

  // --- 1. All 14 Scenarios Keyword & Template Rendering ---
  console.log('--- 1. Barcha 14 ta Favqulodda Holat Shablonlarini Tekshirish ---');

  const categories = Object.keys(EMERGENCY_TEMPLATES);
  assert('Jami 14 ta favqulodda shablon mavjud', categories.length === 14);

  categories.forEach((cat) => {
    const renderedLotin = renderEmergencyTemplate(cat, 'lotin');
    const renderedKirill = renderEmergencyTemplate(cat, 'kirill');
    const renderedRus = renderEmergencyTemplate(cat, 'rus');

    assert(`Shablon "${cat}" (Lotin) to'g'ri render qilindi`, renderedLotin !== null && renderedLotin.length > 20);
    assert(`Shablon "${cat}" (Kirill) to'g'ri render qilindi`, renderedKirill !== null && renderedKirill.length > 20);
    assert(`Shablon "${cat}" (Rus) to'g'ri render qilindi`, renderedRus !== null && renderedRus.length > 20);
  });

  // --- 2. Level 1 Strictly NO TRADESMEN Test ---
  console.log('\n--- 2. 1-Darajada Hech Qanday Usta Chiqmasligini Tekshirish ---');

  const level1Categories = categories.filter((c) => EMERGENCY_TEMPLATES[c].level === 1);
  assert('1-darajada 10 ta hayotga xavf holati mavjud', level1Categories.length === 10);

  level1Categories.forEach((cat) => {
    const text = renderEmergencyTemplate(cat, 'lotin') || '';
    const hasTradesman = text.includes('santexnik') || text.includes('kafelchi') || text.includes('elektrik') || text.includes('usta:');
    assert(`1-darajali "${cat}" shablonida USTA YO'Q`, !hasTradesman);
  });

  // --- 3. Missing Local Numbers Line Stripping Test ---
  console.log('\n--- 3. Raqam Kiritilmaganda Qator BUTUNLAY Olib Tashlanishini Tekshirish ---');

  const renderedWithoutLocalNum = renderEmergencyTemplate('gas_leak', 'lotin', {});
  assert('Raqam berilmaganda {mahalliy_gaz} placeholder olib tashlandi', !renderedWithoutLocalNum?.includes('{mahalliy_gaz}'));
  assert('Bo\'sh joy yoki "raqam yo\'q" yozuvi qolmadi', !renderedWithoutLocalNum?.includes('undefined') && !renderedWithoutLocalNum?.includes('null'));

  const renderedWithLocalNum = renderEmergencyTemplate('gas_leak', 'lotin', { mahalliy_gaz: '+998 70 612 04 04' });
  assert('Local raqam berilganda "+998 70 612 04 04" matnda chiqdi', renderedWithLocalNum?.includes('+998 70 612 04 04') === true);

  // --- 4. Render Sample Level 1 Message ---
  console.log('\n--- 🚨 GAZ HIDI Shablonining Real Ko\'rinishi (Lotin) ---');
  console.log(renderedWithLocalNum);
  console.log('-------------------------------------------------------\n');

  console.log('======================================================');
  console.log(`📊 TEST YAKUNI: Jami: ${totalTests} | ✅ O'tdi: ${passedTests} | ❌ Xato: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runEmergencyTests();
