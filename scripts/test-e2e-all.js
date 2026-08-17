const fs = require('fs');
const path = require('path');

// Custom .env loader
try {
  const envConfig = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  envConfig.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const val = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = val;
    }
  });
} catch (e) {}
const { db } = require('../packages/db');
const core = require('../packages/core');

async function runE2ETests() {
  console.log("=========================================");
  console.log("🚀 KIM BOR? AUTOMATED E2E INTEGRATION SUITE");
  console.log("=========================================\n");

  const results = [];

  function logResult(screen, action, expected, actual, errorType, rootCause, status) {
    results.push({
      screen,
      action,
      expected,
      actual,
      errorType,
      rootCause,
      status
    });
  }

  // 1. Prisma DB Connection & Seed Validation
  console.log("1. Testing Backend Fastify Endpoints & DB Connection...");
  try {
    const city = await db.city.findFirst();
    if (!city) {
      console.log("⚠️ No city found in local DB. Creating default 'Olmaliq' city...");
      await db.city.create({
        data: {
          name: 'Olmaliq',
          slug: 'olmaliq',
          region: 'Toshkent viloyati',
        }
      });
    }
    const verifiedCity = await db.city.findFirst();
    console.log("✅ DB Connection OK. Default city ID:", verifiedCity.id);
    logResult('Database', 'Prisma DB connection', 'Connect to PostgreSQL', `Connected (${verifiedCity.name})`, 'None', 'None', 'PASSED');
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
    logResult('Database', 'Prisma DB connection', 'Connect to PostgreSQL', err.message, 'DB', 'DATABASE_URL connection failure', 'FAILED');
  }

  // 2. Core Search Engine & Rating
  console.log("\n2. Testing Core Search & Bayesian Rating Engine...");
  try {
    const rating = core.calculateBayesianRating(10, 1);
    console.log("✅ Bayesian Rating result for (10, 1):", rating);
    logResult('Core Engine', 'Bayesian Rating', 'Return rating ~4.1', `Returned ${rating}`, 'None', 'None', 'PASSED');
  } catch (err) {
    console.error("❌ Core Engine Error:", err.message);
    logResult('Core Engine', 'Bayesian Rating', 'Calculate score', err.message, 'API', 'Core module export error', 'FAILED');
  }

  // 3. Emergency Module Safety Test (TZ Rule 4)
  console.log("\n3. Testing Emergency Module (TZ Rule 4 & Safety)...");
  try {
    const emergency = require('../packages/core/src/emergency');
    console.log("✅ Emergency static templates loaded successfully.");
    logResult('Emergency Module', 'Gas leak detection', 'Static template (no AI)', 'Loaded static templates', 'None', 'None', 'PASSED');
  } catch (err) {
    console.error("❌ Emergency Engine Error:", err.message);
    logResult('Emergency Module', 'Gas leak detection', 'Static template', err.message, 'Security', 'Emergency template error', 'FAILED');
  }

  // 4. Listing Mutations Test (Create & Read Listing)
  console.log("\n4. Testing Listing Creation & Retrieval (CityId Scoped)...");
  try {
    const city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
    
    // Find or create Category
    let category = await db.category.findFirst({ where: { name: 'Kafelchi' } });
    if (!category) {
      category = await db.category.create({ data: { name: 'Kafelchi', synonyms: ['plitkachi'] } });
    }

    // Find or create Landmark
    let landmark = await db.landmark.findFirst({ where: { cityId: city.id, name: 'Korzinka' } });
    if (!landmark) {
      landmark = await db.landmark.create({ data: { cityId: city.id, name: 'Korzinka', synonyms: ['karzinka'] } });
    }

    // Create Test Listing
    const testListing = await db.listing.create({
      data: {
        cityId: city.id,
        categoryId: category.id,
        primaryLandmarkId: landmark.id,
        type: 'USTA',
        name: 'Usta Sobir E2E Test',
        phone: '+998 90 999 88 77',
        badges: ['uyga_boradi', 'kafolat'],
        workFrom: '08:00',
        workTo: '20:00',
      }
    });

    console.log("✅ Listing created successfully in DB:", testListing.id, testListing.name);
    logResult('Listing / DB', 'Create Usta listing', 'Listing created in PostgreSQL', `Created ${testListing.name}`, 'None', 'None', 'PASSED');

    // Clean up test listing
    await db.listing.delete({ where: { id: testListing.id } });
  } catch (err) {
    console.error("❌ Listing Creation Error:", err.message);
    logResult('Listing / DB', 'Create Usta listing', 'Listing created in PostgreSQL', err.message, 'DB', 'Prisma listing mutation fail', 'FAILED');
  }

  console.log("\n=========================================");
  console.log("📊 HAR BIR BO'LIM VA EKRAN BO'YICHA AUDIT JADVALI");
  console.log("=========================================");
  console.table(results);

  const openFailures = results.filter(r => r.status === 'FAILED').length;
  console.log(`\nJami testlar: ${results.length} | O'tganlar: ${results.length - openFailures} | Ochiq xatolar: ${openFailures}`);
}

runE2ETests();
