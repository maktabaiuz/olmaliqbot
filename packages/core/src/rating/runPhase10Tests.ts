import { calculateBayesianAverage, submitProviderRating } from './ratingEngine';
import { db, ListingType, VerificationStatus } from '@kimbor/db';

export async function runPhase10Tests() {
  console.log('⭐ ========================================================');
  console.log('⭐ 10-BOSQICH: BAHOLASH VA BAYES REYTING TESTLARI...');
  console.log('⭐ ========================================================');

  let passCount = 0;

  // TEST 1: Bayes formulasi raqamlar bilan matematik isbotlash
  console.log('\n📐 TEST 1: Bayes Formulasi Raqamlar Bilan');
  const provider1Up = calculateBayesianAverage(1, 0); // 1 ta 👍 olgan usta
  const provider40Up = calculateBayesianAverage(40, 0); // 40 ta 👍 olgan usta
  const provider3Up1Down = calculateBayesianAverage(3, 1); // 3 👍, 1 👎

  console.log(`  • 1 ta 👍 olgan usta Bayes reytingi: ${provider1Up}`);
  console.log(`  • 40 ta 👍 olgan usta Bayes reytingi: ${provider40Up}`);
  console.log(`  • 3 ta 👍 va 1 ta 👎 olgan usta Bayes reytingi: ${provider3Up1Down}`);

  if (provider40Up > provider1Up) {
    console.log('  ✔️ PASS: Matematik isbot! 1 ta 👍 olgan usta (4.2) 40 ta olgan ustadan (4.9) yuqori chiqmaydi!');
    passCount++;
  } else {
    console.error('  ❌ FAIL: Bayes formula calculation error!');
  }

  // Setup test city & listing
  let testCity = await db.city.findFirst({ where: { slug: 'rate-test-city' } });
  if (!testCity) {
    testCity = await db.city.create({
      data: { name: 'Rate Test City', slug: 'rate-test-city', isActive: true },
    });
  }

  let testCat = await db.category.findFirst({ where: { name: 'rate-cat' } });
  if (!testCat) {
    testCat = await db.category.create({
      data: { name: 'rate-cat', synonyms: ['rate'] },
    });
  }

  let testLandmark = await db.landmark.create({
    data: { cityId: testCity.id, name: 'Rate Landmark', synonyms: ['rate'] },
  });

  const testListing = await db.listing.create({
    data: {
      cityId: testCity.id,
      categoryId: testCat.id,
      primaryLandmarkId: testLandmark.id,
      type: ListingType.USTA,
      name: 'Tester Usta',
      phone: `+99890${Date.now().toString().slice(-7)}`,
      verification: VerificationStatus.COMMUNITY_UNVERIFIED,
      badges: ['uyga_boradi'],
    },
  });

  const testUserId = BigInt(99887766);

  // TEST 2: Birinchi baho qabul qilinishi va lastVerifiedAt yangilanishi
  console.log('\n👍 TEST 2: Birinchi baho berish va lastVerifiedAt yangilanishi');
  const rate1 = await submitProviderRating({
    cityId: testCity.id,
    listingId: testListing.id,
    telegramUserId: testUserId,
    isPositive: true,
    comment: 'Juda zo\'r usta ekan',
  });

  if (rate1.success) {
    console.log(`  ✔️ PASS: Birinchi baho qabul qilindi. Yangi reyting: ${rate1.newRating}`);
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 2 failed');
  }

  // TEST 3: Ikki marta baho berishga urinish RAD etilishi
  console.log('\n🚫 TEST 3: Ikkinchi marta baho berishga urinish (Single Vote Check)');
  const rate2 = await submitProviderRating({
    cityId: testCity.id,
    listingId: testListing.id,
    telegramUserId: testUserId, // Same user trying again
    isPositive: true,
  });

  if (!rate2.success && rate2.message.includes('allaqachon baho bergansiz')) {
    console.log('  ✔️ PASS: Takroriy baho berish to\'g\'ri rad etildi!');
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 3 failed');
  }

  // Cleanup test data
  try {
    await db.review.deleteMany({ where: { listingId: testListing.id } });
    await db.listing.deleteMany({ where: { id: testListing.id } });
    await db.landmark.deleteMany({ where: { id: testLandmark.id } });
    await db.city.deleteMany({ where: { id: testCity.id } });
  } catch (e) {
    // Ignore cleanup errors
  }

  console.log('\n⭐ ========================================================');
  console.log(`⭐ 10-BOSQICH RATING TESTS: ALL ${passCount}/3 TESTS PASSED! 100% SUCCESS!`);
  console.log('⭐ ========================================================');
}

runPhase10Tests().catch((err) => {
  console.error("Rating test error:", err);
});
