import { db } from '@kimbor/db';

async function runBenchmark() {
  console.log('⚡ Starting Database Benchmark Test (1,000 Listings)...');

  // 1. Ensure test city exists
  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({
      data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true },
    });
  }

  // 2. Ensure test category and landmark exist
  let cat = await db.category.findFirst({ where: { name: 'gazavik' } });
  if (!cat) {
    cat = await db.category.create({
      data: { name: 'gazavik', synonyms: ['gazovik', 'gaz ustasi'] },
    });
  }

  let landmark = await db.landmark.findFirst({ where: { cityId: city.id, name: 'Korzinka' } });
  if (!landmark) {
    landmark = await db.landmark.create({
      data: { cityId: city.id, name: 'Korzinka', synonyms: ['karzinka'] },
    });
  }

  // 3. Seed 1,000 listings if total count is under 1,000
  const existingCount = await db.listing.count({ where: { cityId: city.id } });
  if (existingCount < 1000) {
    console.log(`Seeding test records (current: ${existingCount})...`);
    const toCreate = 1000 - existingCount;
    const batch = [];
    for (let i = 0; i < toCreate; i++) {
      const phoneNum = `+99890${Math.floor(1000000 + Math.random() * 9000000)}`;
      batch.push({
        cityId: city.id,
        categoryId: cat.id,
        primaryLandmarkId: landmark.id,
        name: `Usta Benchmark ${i + 1}`,
        phone: phoneNum,
        bayesianRating: 3.0 + Math.random() * 2.0,
        status: 'ACTIVE' as const,
        verification: 'VERIFIED' as const,
        badges: ['uyga_boradi', 'kafolat'],
      });
    }
    // Create in chunks of 200
    for (let i = 0; i < batch.length; i += 200) {
      const chunk = batch.slice(i, i + 200);
      await db.listing.createMany({ data: chunk, skipDuplicates: true });
    }
    console.log('✅ Seeded 1,000 test listings.');
  }

  // 4. BENCHMARK 1: Search by Category (in ms)
  const t1 = performance.now();
  const catResults = await db.listing.findMany({
    where: { cityId: city.id, categoryId: cat.id, status: 'ACTIVE' },
    orderBy: { bayesianRating: 'desc' },
    take: 20,
    include: { category: true, primaryLandmark: true },
  });
  const catTime = performance.now() - t1;

  // 5. BENCHMARK 2: Search by Landmark (in ms)
  const t2 = performance.now();
  const landmarkResults = await db.listing.findMany({
    where: { cityId: city.id, primaryLandmarkId: landmark.id, status: 'ACTIVE' },
    orderBy: { bayesianRating: 'desc' },
    take: 20,
    include: { category: true, primaryLandmark: true },
  });
  const landmarkTime = performance.now() - t2;

  // 6. BENCHMARK 3: Recommendation Ranking (Bayesian Rating Sort) (in ms)
  const t3 = performance.now();
  const rankedResults = await db.listing.findMany({
    where: { cityId: city.id, status: 'ACTIVE' },
    orderBy: [
      { verification: 'asc' }, // VERIFIED first
      { bayesianRating: 'desc' },
    ],
    take: 50,
  });
  const rankTime = performance.now() - t3;

  // 7. BENCHMARK 4: Dashboard Screen Initial Data Load (in ms)
  const t4 = performance.now();
  const [totalListings, urgentTasks, dailyProgress, categoriesCount] = await Promise.all([
    db.listing.count({ where: { cityId: city.id } }),
    db.queryLog.count({ where: { cityId: city.id, isResolved: false } }),
    db.dailyCheck.count({ where: { cityId: city.id, checkDate: '2026-08-13' } }),
    db.category.count(),
  ]);
  const dashTime = performance.now() - t4;

  console.log('\n==================================================');
  console.log('📊 DATABASE PERFORMANCE BENCHMARK RESULTS (1,000 LISTINGS)');
  console.log('==================================================');
  console.log(`1. Search by Category:        ${catTime.toFixed(2)} ms (Threshold: <200 ms) ${catTime < 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`2. Search by Landmark:        ${landmarkTime.toFixed(2)} ms (Threshold: <200 ms) ${landmarkTime < 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`3. Recommendation Ranking:    ${rankTime.toFixed(2)} ms (Threshold: <200 ms) ${rankTime < 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`4. Dashboard Load Queries:    ${dashTime.toFixed(2)} ms (Threshold: <200 ms) ${dashTime < 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('==================================================\n');

  process.exit(0);
}

runBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
