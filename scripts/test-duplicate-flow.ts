import { db } from '@kimbor/db';

async function main() {
  console.log("=== Testing Duplicate Detection & Multiple Listings Flow ===");

  // 1. Get or create a city
  const city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    console.error("City 'olmaliq' not found!");
    process.exit(1);
  }

  const testPhone = "+998909998877";

  // Clean up previous test listings
  await db.listing.deleteMany({
    where: { phone: testPhone },
  });

  // Create Category and Landmark
  let category = await db.category.findFirst({ where: { name: 'Elektrik' } });
  if (!category) {
    category = await db.category.create({ data: { name: 'Elektrik', synonyms: ['elektrik'] } });
  }

  let landmark = await db.landmark.findFirst({ where: { cityId: city.id, name: 'Bozor' } });
  if (!landmark) {
    landmark = await db.landmark.create({ data: { cityId: city.id, name: 'Bozor', synonyms: ['bozor'] } });
  }

  // STEP 1: Create 1st Listing
  const l1 = await db.listing.create({
    data: {
      cityId: city.id,
      categoryId: category.id,
      primaryLandmarkId: landmark.id,
      name: "Jasur Elektrik",
      phone: testPhone,
      consentGiven: true,
      jargonSynonyms: ["bozor elektrik"],
    },
  });
  console.log("✅ 1st Listing created:", l1.id, l1.name);

  // STEP 2: Simulate Check Duplicate Query
  const existingListings = await db.listing.findMany({
    where: { cityId: city.id, status: 'ACTIVE' },
    include: { category: true, primaryLandmark: true },
  });

  const cleanSearchPhone = "909998877";
  const match = existingListings.find(item => {
    const itemCleanPhone = item.phone ? item.phone.replace(/\D/g, '') : '';
    return itemCleanPhone.endsWith(cleanSearchPhone);
  });

  if (match) {
    console.log("✅ Duplicate detection works! Found:", match.name, match.phone);
  } else {
    console.error("❌ Duplicate detection failed!");
    process.exit(1);
  }

  // STEP 3: Create 2nd Listing with SAME phone (Confirmed Different Person/Profession)
  let category2 = await db.category.findFirst({ where: { name: 'Santexnik' } });
  if (!category2) {
    category2 = await db.category.create({ data: { name: 'Santexnik', synonyms: ['santexnik'] } });
  }

  const l2 = await db.listing.create({
    data: {
      cityId: city.id,
      categoryId: category2.id,
      primaryLandmarkId: landmark.id,
      name: "Sardor Santexnik",
      phone: testPhone,
      consentGiven: true,
      jargonSynonyms: ["suv usta"],
    },
  });
  console.log("✅ 2nd Listing with same phone created successfully without DB crash:", l2.id, l2.name);

  // Clean up
  await db.listing.deleteMany({ where: { phone: testPhone } });
  console.log("=== ALL DUPLICATE FLOW TESTS PASSED! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
