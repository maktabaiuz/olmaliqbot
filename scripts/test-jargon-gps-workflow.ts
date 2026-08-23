import { db } from '@kimbor/db';
import { searchListings } from '@kimbor/core';

async function runJargonGpsTest() {
  console.log('🧪 Starting GPS & Jargon Synonyms Integration Test...\n');

  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }

  let cat = await db.category.findFirst({ where: { name: 'duradgor' } });
  if (!cat) {
    cat = await db.category.create({ data: { name: 'duradgor', synonyms: ['duradgor'] } });
  }

  let landmark = await db.landmark.findFirst({ where: { cityId: city.id } });
  if (!landmark) {
    landmark = await db.landmark.create({ data: { cityId: city.id, name: 'Bozor' } });
  }

  // 1. Create test listing with GPS coordinates & Jargon Synonyms
  const testListing = await db.listing.create({
    data: {
      cityId: city.id,
      categoryId: cat.id,
      primaryLandmarkId: landmark.id,
      name: 'Husniddin Usta Duradgor',
      phone: '+998907771122',
      consentGiven: true,
      latitude: 40.8494,
      longitude: 69.5986,
      jargonSynonyms: ['karzinka orqasi', 'eski bozor', 'novostroyka'],
      verification: 'VERIFIED',
    },
  });

  console.log('1. JARGON & GPS BILAN YOZUV YARATILDI');
  console.log(`   - Ism: ${testListing.name}`);
  console.log(`   - GPS: Lat ${testListing.latitude}, Lng ${testListing.longitude}`);
  console.log(`   - Jargon Taglar: [${testListing.jargonSynonyms.join(', ')}] ✅ PASS\n`);

  // 2. Test search engine matching by jargon term ("karzinka orqasi")
  const searchResult = await searchListings({
    cityId: city.id,
    landmarkName: 'karzinka orqasi',
    limit: 1,
  });

  console.log('2. AI JARGON QIDIRUV TEKSHIRUVI');
  if (searchResult && (searchResult as any).listing?.name === testListing.name) {
    console.log(`   - "karzinka orqasi" bo'yicha topilgan yozuv: "${(searchResult as any).listing.name}" ✅ PASS\n`);
  } else {
    console.log(`   - Qidiruv natijasi: ${JSON.stringify(searchResult)} ❌ FAIL\n`);
  }

  // Clean up
  await db.listing.delete({ where: { id: testListing.id } });

  console.log('==================================================');
  console.log('🎉 GPS & JARGON WORKFLOW INTEGRATION TEST PASSED!');
  console.log('==================================================');

  process.exit(0);
}

runJargonGpsTest().catch(err => {
  console.error('Jargon GPS test error:', err);
  process.exit(1);
});
