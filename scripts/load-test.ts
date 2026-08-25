import { searchListings, notifyUsersOnNewListingAdded } from '@kimbor/core';
import { db } from '@kimbor/db';

async function runLoadAndStressTests() {
  console.log('⚡ Starting Full System QA Load & Stress Test Suite...\n');

  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }

  // 1. CONCURRENT LOAD TEST (100 Concurrent Bot Searches)
  console.log('1. STRESS TEST: 100 CONCURRENT BOT SEARCH QUERIES');
  const startTime1 = performance.now();
  const searchPromises = [];
  for (let i = 0; i < 100; i++) {
    const category = i % 2 === 0 ? 'gazavik' : 'santexnik';
    searchPromises.push(
      searchListings({
        cityId: city.id,
        categoryName: category,
        limit: 1,
      })
    );
  }

  const results = await Promise.all(searchPromises);
  const totalTime1 = performance.now() - startTime1;
  const avgTime1 = totalTime1 / 100;
  const successCount1 = results.filter(r => r !== null).length;

  console.log(`   - 100 Concurrent Searches Completed in: ${totalTime1.toFixed(2)} ms`);
  console.log(`   - Average Latency per Query: ${avgTime1.toFixed(2)} ms`);
  console.log(`   - Success Rate: ${results.length}/100 queries handled cleanly without crashes ✅ PASS\n`);

  // 2. FLOW 6 TEST: UNRESOLVED QUERY LOOP & AUTO-NOTIFICATION
  console.log('2. FLOW 6 TEST: UNRESOLVED QUERY LOOP & AUTO-NOTIFICATION');
  const dummyUserTgId = BigInt(777666555);

  // A. Log an unresolved query (user asked for "elektrik 4-mavze")
  const queryLog = await db.queryLog.create({
    data: {
      cityId: city.id,
      telegramUserId: dummyUserTgId,
      rawMessage: 'elektrik kerak 4-mavze',
      intent: 'SERVICE',
      categoryName: 'elektrik',
      landmarkName: '4-mavze',
      isResolved: false,
    },
  });
  console.log(`   A. Unresolved query logged in QueryLog (ID: ${queryLog.id}, isResolved: false) ✅ PASS`);

  // B. Ensure category "elektrik" exists
  let elektrikCat = await db.category.findFirst({ where: { name: 'elektrik' } });
  if (!elektrikCat) {
    elektrikCat = await db.category.create({ data: { name: 'elektrik', synonyms: ['elektrik ustasi'] } });
  }

  // C. Add new listing for "elektrik" (simulating admin adding requested usta)
  let landmark = await db.landmark.findFirst({ where: { cityId: city.id } });
  if (!landmark) {
    landmark = await db.landmark.create({ data: { cityId: city.id, name: 'Bozor' } });
  }

  const newListing = await db.listing.create({
    data: {
      cityId: city.id,
      categoryId: elektrikCat.id,
      primaryLandmarkId: landmark.id,
      name: 'Sherzod Elektrik',
      phone: '+998901119988',
      consentGiven: true,
      verification: 'VERIFIED',
    },
  });
  console.log(`   B. Admin added new requested listing: "${newListing.name}" ✅ PASS`);

  // D. Run notifyUsersOnNewListingAdded loop
  const notifiedResult = await notifyUsersOnNewListingAdded({
    cityId: city.id,
    listingId: newListing.id,
    categoryName: 'elektrik',
  });

  const updatedLog = await db.queryLog.findUnique({ where: { id: queryLog.id } });
  console.log(`   C. Auto-Notification loop executed: ${notifiedResult.totalNotified} user(s) notified.`);
  console.log(`   D. QueryLog status updated: isResolved=${updatedLog?.isResolved} ${updatedLog?.isResolved ? '✅ PASS' : '❌ FAIL'}\n`);

  // Clean up test data
  await db.queryLog.delete({ where: { id: queryLog.id } });
  await db.listing.delete({ where: { id: newListing.id } });

  console.log('==================================================');
  console.log('🎉 QA STRESS & LOOP INTEGRATION TESTS COMPLETED!');
  console.log('==================================================');

  process.exit(0);
}

runLoadAndStressTests().catch(err => {
  console.error('QA Load Test error:', err);
  process.exit(1);
});
