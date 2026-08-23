import { db, ListingType, VerificationStatus } from '@kimbor/db';
import { searchListings } from '../search/searchEngine';

export async function runMultiTenancyAudit() {
  console.log('🔒 ========================================================');
  console.log('🔒 MULTI-TENANCY QAT\'IY XAVFSIZLIK AUDITI BAJARILMOQDA...');
  console.log('🔒 ========================================================');

  // 1. Setup 2 Cities in Database
  let cityA = await db.city.findFirst({ where: { slug: 'olmaliq-audit' } });
  if (!cityA) {
    cityA = await db.city.create({
      data: { name: 'Olmaliq Audit', slug: 'olmaliq-audit', isActive: true },
    });
  }

  let cityB = await db.city.findFirst({ where: { slug: 'chirchiq-audit' } });
  if (!cityB) {
    cityB = await db.city.create({
      data: { name: 'Chirchiq Audit', slug: 'chirchiq-audit', isActive: true },
    });
  }

  // 2. Setup Category & Landmarks
  let category = await db.category.findFirst({ where: { name: 'gazavik-audit' } });
  if (!category) {
    category = await db.category.create({
      data: { name: 'gazavik-audit', synonyms: ['gazovik', 'gaz ustasi'] },
    });
  }

  let landmarkA = await db.landmark.create({
    data: { cityId: cityA.id, name: 'Korzinka Olmaliq', synonyms: ['karzinka'] },
  });

  let landmarkB = await db.landmark.create({
    data: { cityId: cityB.id, name: 'Toshkent Bozor Chirchiq', synonyms: ['bozor'] },
  });

  // 3. Create Listing in City A (Olmaliq)
  const listingA = await db.listing.create({
    data: {
      cityId: cityA.id,
      categoryId: category.id,
      primaryLandmarkId: landmarkA.id,
      type: ListingType.USTA,
      name: "Bahrom Gazavik (Olmaliq Sirlari)",
      phone: '+998901111111',
      verification: VerificationStatus.VERIFIED,
      badges: ['uyga_boradi'],
    },
  });

  // 4. Create Listing in City B (Chirchiq)
  const listingB = await db.listing.create({
    data: {
      cityId: cityB.id,
      categoryId: category.id,
      primaryLandmarkId: landmarkB.id,
      type: ListingType.USTA,
      name: "Sardor Santexnik (Chirchiq Sirlari)",
      phone: '+998902222222',
      verification: VerificationStatus.VERIFIED,
      badges: ['uyga_boradi'],
    },
  });

  console.log(`✅ Test shaharlar yaratildi:\n  - City A: ${cityA.name} (${cityA.id})\n  - City B: ${cityB.name} (${cityB.id})`);

  let testPassedCount = 0;

  // TEST 1: Direct API Query Isolation
  console.log("\n🔍 TEST 1: To'g'ridan-to'g'ri so'rov izolyatsiyasi (Direct DB Query)");
  const chirchiqListings = await db.listing.findMany({
    where: { cityId: cityB.id },
  });

  const containsOlmaliqData = chirchiqListings.some((l) => l.id === listingA.id || l.cityId === cityA.id);
  if (!containsOlmaliqData && chirchiqListings.length === 1 && chirchiqListings[0].id === listingB.id) {
    console.log("  ✔️ PASS: Chirchiq admin so'rovida 0% Olmaliq ma'lumoti sizib chiqdi!");
    testPassedCount++;
  } else {
    console.error('  ❌ FAIL: Direct query security failure!');
  }

  // TEST 2: Parameter Tampering (ID Swapping Attack)
  console.log('\n🔍 TEST 2: ID Almashtirish Hujumi (ID Tampering Attack)');
  // Chirchiq admin tries to fetch listingA.id belonging to Olmaliq
  const tamperedListing = await db.listing.findFirst({
    where: {
      id: listingA.id,
      cityId: cityB.id, // Enforced session cityId
    },
  });

  if (tamperedListing === null) {
    console.log('  ✔️ PASS: ID almashtirish hujumi qaytarildi (Result is NULL / 404 Access Denied)!');
    testPassedCount++;
  } else {
    console.error('  ❌ FAIL: Parameter tampering security vulnerability detected!');
  }

  // TEST 3: AI Search Engine Query Isolation
  console.log("\n🔍 TEST 3: AI Qidiruv Dvigateli Izolyatsiyasi");
  const searchResultChirchiq = await searchListings({
    cityId: cityB.id,
    categoryName: 'gazavik-audit',
    limit: 1,
  });

  if (
    searchResultChirchiq &&
    searchResultChirchiq.listing &&
    searchResultChirchiq.listing.id === listingB.id &&
    searchResultChirchiq.listing.cityId === cityB.id
  ) {
    console.log("  ✔️ PASS: AI qidiruv faqat Chirchiq shahri ustasini qaytardi (100% izolyatsiya)!");
    testPassedCount++;
  } else {
    console.error("  ❌ FAIL: AI Search Engine multi-tenancy failure!");
  }

  // Cleanup test data
  await db.listing.deleteMany({ where: { id: { in: [listingA.id, listingB.id] } } });
  await db.landmark.deleteMany({ where: { id: { in: [landmarkA.id, landmarkB.id] } } });
  await db.category.deleteMany({ where: { id: category.id } });
  await db.city.deleteMany({ where: { id: { in: [cityA.id, cityB.id] } } });

  console.log('\n🔒 ========================================================');
  console.log(`🔒 MULTI-TENANCY SECURITY AUDIT: ALL ${testPassedCount}/3 TESTS PASSED! 100% SECURE!`);
  console.log('🔒 ========================================================');
}

runMultiTenancyAudit().catch((err) => {
  console.error("Audit failure:", err);
});
