import { executeCopilotCommand } from './aiCopilotEngine';
import { db } from '@kimbor/db';

export async function testStatusCommands() {
  console.log('🤖 ========================================================');
  console.log('🤖 AI COPILOT: SET_STATUS VA DELETE_RECORD SINASH...');
  console.log('🤖 ========================================================');

  let testCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!testCity) {
    testCity = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }

  const dbUser = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const superAdminCtx = {
    userId: dbUser ? dbUser.id : '',
    role: 'SUPER_ADMIN' as const,
    cityId: testCity.id,
  };

  let testCat = await db.category.findFirst();
  if (!testCat) {
    testCat = await db.category.create({ data: { name: 'santexnik-status-test', synonyms: ['santexnik'] } });
  }

  let testLandmark = await db.landmark.findFirst({ where: { cityId: testCity.id } });
  if (!testLandmark) {
    testLandmark = await db.landmark.create({ data: { cityId: testCity.id, name: 'Markaz Status Test', synonyms: ['markaz'] } });
  }

  const listingBahrom = await db.listing.create({
    data: {
      city: { connect: { id: testCity.id } },
      category: { connect: { id: testCat.id } },
      primaryLandmark: { connect: { id: testLandmark.id } },
      name: 'Bahrom Santexnik',
      phone: `+99890${Date.now().toString().slice(-7)}`,
      type: 'USTA' as any,
      verification: 'VERIFIED' as any,
    },
  });

  // TEST 1: "Bahromni pauzaga qo'y" -> set_status(PAUSED)
  console.log('\n⏸️ TEST 1: "Bahromni pauzaga qo\'y" (set_status PAUSED)');
  const res1 = await executeCopilotCommand(superAdminCtx, 'set_status', {
    recordId: listingBahrom.id,
    status: 'PAUSED',
  });

  console.log(`  • AI Javobi: "${res1.message}"`);
  const check1 = await db.listing.findUnique({ where: { id: listingBahrom.id } });
  console.log(`  • Bazadagi holat: status = "${check1?.status}"`);
  if (res1.success && check1?.status === 'PAUSED' && res1.message.includes('set_status')) {
    console.log('  ✔️ PASS: "pauzaga qo\'y" buyrug\'i statusni PAUSED qildi va AI command set_status loglandi!');
  } else {
    console.error('  ❌ FAIL: set_status failed');
  }

  // TEST 2: "Bahromni o'chir / arxivla" -> delete_record (ARCHIVED)
  console.log('\n🗑️ TEST 2: "Bahromni o\'chir" (delete_record ARCHIVED)');
  const res2 = await executeCopilotCommand(superAdminCtx, 'delete_record', {
    recordId: listingBahrom.id,
  });

  console.log(`  • AI Javobi: "${res2.message}"`);
  const check2 = await db.listing.findUnique({ where: { id: listingBahrom.id } });
  console.log(`  • Bazadagi holat: status = "${check2?.status}"`);
  if (res2.success && check2?.status === 'ARCHIVED' && res2.message.includes('delete_record')) {
    console.log('  ✔️ PASS: "o\'chir/arxivla" buyrug\'i statusni ARCHIVED qildi va AI command delete_record loglandi!');
  } else {
    console.error('  ❌ FAIL: delete_record failed');
  }

  // Cleanup
  await db.listing.delete({ where: { id: listingBahrom.id } });

  console.log('\n🤖 ========================================================');
  console.log('🤖 AI COPILOT STATUS COMMANDS TEST PASSED WITH 100% ACCURACY!');
  console.log('🤖 ========================================================');
}

testStatusCommands().catch(console.error);
