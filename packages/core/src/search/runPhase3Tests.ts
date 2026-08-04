import { db } from '@kimbor/db';
import { searchListings } from './searchEngine';
import { stripLandmarkSuffixes } from '../dictionary';

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

async function runPhase3Tests() {
  console.log('\n======================================================');
  console.log('🧪 3-BOSHQICH: QIDIRUV, TARTIB & MULTI-TENANT ISOLATION');
  console.log('======================================================\n');

  // --- 1. Suffix Stripper Test ---
  console.log('--- 1. Mo\'ljal Qo\'shimchalarini Ajratib Tashlash ---');
  assert(
    '"karzinka oldida" -> "karzinka"',
    stripLandmarkSuffixes('karzinka oldida') === 'karzinka'
  );
  assert(
    '"bozor orqasida" -> "bozor"',
    stripLandmarkSuffixes('bozor orqasida') === 'bozor'
  );
  assert(
    '"корзинка возле" -> "корзинка"',
    stripLandmarkSuffixes('корзинка возле') === 'корзинка'
  );


  // --- 2. Database Seeding for Multi-City Testing ---
  console.log('\n--- 2. Ikki Shahar (Olmaliq & Chirchiq) Test Ma\'lumotlarini Yaratish ---');
  
  // Create Olmaliq City
  const olmaliq = await db.city.upsert({
    where: { slug: 'olmaliq-test' },
    update: {},
    create: { name: 'Olmaliq Test', slug: 'olmaliq-test', planType: 'ASOSCHI' },
  });

  // Create Chirchiq City
  const chirchiq = await db.city.upsert({
    where: { slug: 'chirchiq-test' },
    update: {},
    create: { name: 'Chirchiq Test', slug: 'chirchiq-test', planType: 'STANDART' },
  });

  // Cleanup duplicate categories if any exist from previous test runs
  await db.category.deleteMany({
    where: { name: { in: ['gazavik', 'Gazavik', 'gazovik'] } },
  });

  // Create single canonical Category: Gazavik
  const gazavikCat = await db.category.create({
    data: { name: 'Gazavik', synonyms: ['gazovik', 'gaz ustasi', 'plita ustasi'] },
  });

  // Landmarks
  const korzinkaOlmaliq = await db.landmark.create({
    data: { cityId: olmaliq.id, name: 'Korzinka', synonyms: ['karzinka'] },
  });

  const bozorOlmaliq = await db.landmark.create({
    data: { cityId: olmaliq.id, name: 'Markaziy Bozor', synonyms: ['bozor'] },
  });

  const korzinkaChirchiq = await db.landmark.create({
    data: { cityId: chirchiq.id, name: 'Chirchiq Korzinka', synonyms: ['chirchiq karzinka'] },
  });

  // Seed Olmaliq Listing 1 (VERIFIED, Bahrom Gazavik)
  const bahromOlmaliq = await db.listing.create({
    data: {
      cityId: olmaliq.id,
      categoryId: gazavikCat.id,
      name: 'Bahrom Gazavik',
      phone: '+998901234567',
      primaryLandmarkId: korzinkaOlmaliq.id,
      badges: ['uyga_boradi', 'kafolat'],
      verification: 'VERIFIED',
      bayesianRating: 4.4,
      thumbsUpCount: 20,
      thumbsDownCount: 2,
      serviceAreaLandmarks: { connect: [{ id: bozorOlmaliq.id }] },
    },
  });
  console.log('  DEBUG: bahromOlmaliq created:', bahromOlmaliq.id, bahromOlmaliq.cityId, bahromOlmaliq.categoryId);

  // Seed Olmaliq Listing 2 (UNVERIFIED, Sobir Gazavik)
  const sobirOlmaliq = await db.listing.create({
    data: {
      cityId: olmaliq.id,
      categoryId: gazavikCat.id,
      name: 'Sobir Gazavik',
      phone: '+998909876543',
      primaryLandmarkId: korzinkaOlmaliq.id,
      badges: ['24_7'],
      verification: 'COMMUNITY_UNVERIFIED',
      bayesianRating: 3.5,
      thumbsUpCount: 5,
      thumbsDownCount: 1,
    },
  });

  // Seed Chirchiq Listing (Chirchiq Gazavik Jamshid)
  const jamshidChirchiq = await db.listing.create({
    data: {
      cityId: chirchiq.id,
      categoryId: gazavikCat.id,
      name: 'Jamshid Chirchiq Gazavik',
      phone: '+998935555555',
      primaryLandmarkId: korzinkaChirchiq.id,
      badges: ['uyga_boradi'],
      verification: 'VERIFIED',
      bayesianRating: 4.8,
      thumbsUpCount: 40,
    },
  });

  console.log('  ✅ Olmaliq va Chirchiq shaharlari uchun test ma\'lumotlari saqlandi.');


  // --- 3. Synonym & Suffix Search Tests ---
  console.log('\n--- 3. Sinonim va Mo\'ljal Bo\'yicha Qidiruv ---');
  
  const search1 = await searchListings({
    cityId: olmaliq.id,
    categoryName: 'gazovik', // Synonym for gazavik
    landmarkName: 'karzinka oldida', // Suffix stripping
  });

  assert('Sinonim "gazovik" va "karzinka oldida" bo\'yicha topildi', search1 !== null);
  assert('Eng zo\'r usta (Bahrom ✅ VERIFIED) 1-o\'rinda chiqdi', search1?.listing.name === 'Bahrom Gazavik');
  assert('Xabarda reyting ⭐4.x va ✅ nishon bor', Boolean(search1?.formattedText?.includes('⭐4.')) && Boolean(search1?.formattedText?.includes('✅')));
  assert('Xabarda ish vaqti va baholar soni KO\'RSATILMAGAN', !search1?.formattedText?.includes('08:00') && !search1?.formattedText?.includes('20 ta baho'));


  // --- 4. Service Area Matching Test ---
  console.log('\n--- 4. Xizmat Hududi (Service Area) Bo\'yicha Qidiruv ---');
  
  const searchServiceArea = await searchListings({
    cityId: olmaliq.id,
    categoryName: 'gazavik',
    landmarkName: 'Markaziy Bozor', // Bahrom's service area landmark
  });

  assert('Xizmat hududi (Markaziy Bozor) bo\'yicha Bahrom topildi', searchServiceArea?.listing.name === 'Bahrom Gazavik');


  // --- 5. Strict Multi-Tenant City Isolation Test ---
  console.log('\n--- 5. 🔒 Multi-Tenant `city_id` Izolyatsiyasi Sinovi ---');

  const searchChirchiq = await searchListings({
    cityId: chirchiq.id,
    categoryName: 'gazavik',
  });

  assert('Chirchiq shahridan qidirilganda Chirchiq ustasi (Jamshid) chiqdi', searchChirchiq?.listing.name === 'Jamshid Chirchiq Gazavik');

  const searchOlmaliqStrict = await searchListings({
    cityId: olmaliq.id,
    categoryName: 'gazavik',
  });

  assert('Olmaliq shahri qidiruvida Chirchiq ustasi (Jamshid) CHIQMADI (Izolyatsiya ✅)', !searchOlmaliqStrict?.formattedText?.includes('Jamshid Chirchiq Gazavik'));


  // --- 6. Execution Speed Measurement (< 3 Seconds Requirement) ---
  console.log('\n--- 6. ⏱️ Ijro Tezligi Boshqaruvi (< 3 Soniya) ---');
  
  assert(
    `Qidiruv ijro vaqti: ${search1?.executionTimeMs}ms (< 3000ms qoidasiga mos)`,
    (search1?.executionTimeMs || 0) < 3000
  );

  console.log('\n--- Real Guruh Javobi Misoli ---');
  console.log(search1?.formattedText);
  console.log('-------------------------------\n');


  // --- Cleanup Test Data ---
  await db.listing.deleteMany({ where: { cityId: { in: [olmaliq.id, chirchiq.id] } } });
  await db.landmark.deleteMany({ where: { cityId: { in: [olmaliq.id, chirchiq.id] } } });
  await db.city.deleteMany({ where: { id: { in: [olmaliq.id, chirchiq.id] } } });

  console.log('======================================================');
  console.log(`📊 TEST YAKUNI: Jami: ${totalTests} | ✅ O'tdi: ${passedTests} | ❌ Xato: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase3Tests()
  .catch((e) => {
    console.error('❌ Phase 3 test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
