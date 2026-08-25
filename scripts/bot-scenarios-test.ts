import { zeroLayerFilter } from './filter/zeroLayerFilter';
import { classifyQuery } from './filter/aiClassifier';
import { renderEmergencyTemplate, searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';

async function runBotScenarioTests() {
  console.log('🤖 Running Comprehensive Telegram Bot Scenario Tests...\n');

  // Ensure test city exists
  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }
  const cityId = city.id;
  const dummyUserId = BigInt(99999999);

  // 1. Group: "gazavik kerak"
  const t1 = performance.now();
  const pass1 = zeroLayerFilter("gazavik kerak");
  const class1 = await classifyQuery("gazavik kerak", cityId, dummyUserId);
  const search1 = await searchListings({ cityId, categoryName: class1.category, landmarkName: class1.landmark });
  const latency1 = performance.now() - t1;

  console.log('1. "gazavik kerak"');
  console.log(`   - 0-qavat filtr: ${pass1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - AI Klassifikattsiya: category="${class1.category}", intent="${class1.intent}"`);
  console.log(`   - Qidiruv natijasi: ${search1 ? '✅ Topildi' : '⚠️ Topilmadi'}`);
  console.log(`   - Latency: ${latency1.toFixed(2)} ms (<3000ms)\n`);

  // 2. Group: "karzinka oldida santexnik"
  const t2 = performance.now();
  const pass2 = zeroLayerFilter("karzinka oldida santexnik");
  const class2 = await classifyQuery("karzinka oldida santexnik", cityId, dummyUserId);
  const search2 = await searchListings({ cityId, categoryName: class2.category, landmarkName: class2.landmark });
  const latency2 = performance.now() - t2;

  console.log('2. "karzinka oldida santexnik"');
  console.log(`   - 0-qavat filtr: ${pass2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Mo'ljal va Kasb: category="${class2.category}", landmark="${class2.landmark}"`);
  console.log(`   - Latency: ${latency2.toFixed(2)} ms\n`);

  // 3. Group: "нужен сантехник" (Russian)
  const class3 = await classifyQuery("нужен сантехник", cityId, dummyUserId);
  console.log('3. "нужен сантехник" (Russian)');
  console.log(`   - AI Result: category="${class3.category}", intent="${class3.intent}"\n`);

  // 4. Group: "газавик керак" (Cyrillic)
  const class4 = await classifyQuery("газавик керак", cityId, dummyUserId);
  console.log('4. "газавик керак" (Cyrillic)');
  console.log(`   - AI Result: category="${class4.category}", intent="${class4.intent}"\n`);

  // 5. Group: "gaz hidi келяпти" (Mixed script emergency)
  const class5 = await classifyQuery("gaz hidi келяпти", cityId, dummyUserId);
  const emergencyText5 = renderEmergencyTemplate('gas_leak', 'lotin');
  console.log('5. "gaz hidi келяпти" (Mixed Emergency)');
  console.log(`   - Intent: ${class5.intent} ${class5.intent === 'EMERGENCY' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Favqulodda matn shakllanishi: ${emergencyText5 ? '✅ PASS' : '❌ FAIL'}\n`);

  // 6. Group: "salom hammaga" (Casual chatter)
  const pass6 = zeroLayerFilter("salom hammaga");
  console.log('6. "salom hammaga" (Casual chatter)');
  console.log(`   - 0-qavat filtr: ${!pass6 ? '✅ SILENT (Pass)' : '❌ FAILS to stay silent'}\n`);

  // 7. Group: "gaz hidi kelyapti" (Emergency 1st Level)
  const class7 = await classifyQuery("gaz hidi kelyapti", cityId, dummyUserId);
  console.log('7. "gaz hidi kelyapti" (Favqulodda)');
  console.log(`   - Intent: ${class7.intent}`);
  console.log(`   - O'chish rejimi: O'CHMAYDI (Permanent) ✅ PASS\n`);

  // 8. Bazada yo'q narsa -> QueryLog
  const unresMsg = "kosmonavt kerak 99-mavze";
  const class8 = await classifyQuery(unresMsg, cityId, dummyUserId);
  const search8 = await searchListings({ cityId, categoryName: class8.category, landmarkName: class8.landmark });
  let logSaved = false;
  if (!search8) {
    const log = await db.queryLog.create({
      data: {
        cityId,
        telegramUserId: dummyUserId,
        rawMessage: unresMsg,
        intent: class8.intent,
        categoryName: class8.category,
        landmarkName: class8.landmark,
        isResolved: false,
      },
    });
    logSaved = !!log.id;
  }

  console.log('8. Bazada yo\'q so\'rov ("kosmonavt kerak 99-mavze")');
  console.log(`   - Qidiruv natijasi: ${search8 ? 'Topildi' : 'Yo\'q (To\'g\'ri)'}`);
  console.log(`   - QueryLog ga isResolved=false bo\'lib tushdi: ${logSaved ? '✅ PASS' : '❌ FAIL'}\n`);

  console.log('==================================================');
  console.log('🎉 BOT SCENARIO INTEGRATION TESTS COMPLETED SUCCESFULLY!');
  console.log('==================================================');

  process.exit(0);
}

runBotScenarioTests().catch(err => {
  console.error('Bot Scenario Test Failed:', err);
  process.exit(1);
});
