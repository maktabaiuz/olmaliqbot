import { PrismaClient, ListingType } from '@prisma/client';
import { INITIAL_DICTIONARY } from '@kimbor/core';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding initial dictionary and Olmaliq city data...');

  // 1. Upsert City: Olmaliq
  const olmaliq = await db.city.upsert({
    where: { slug: 'olmaliq' },
    update: {},
    create: {
      name: 'Olmaliq',
      slug: 'olmaliq',
      planType: 'ASOSCHI',
      isActive: true,
    },
  });

  console.log(`✅ City created: ${olmaliq.name} (${olmaliq.id})`);

  // 2. Seed Categories
  for (const cat of INITIAL_DICTIONARY.categories) {
    await db.category.upsert({
      where: { name: cat.name },
      update: {
        synonyms: cat.synonyms,
      },
      create: {
        name: cat.name,
        synonyms: cat.synonyms,
      },
    });
  }
  console.log(`✅ Seeded ${INITIAL_DICTIONARY.categories.length} trade categories.`);

  // 3. Seed Landmarks for Olmaliq
  const createdLandmarks: Record<string, string> = {};
  for (const lm of INITIAL_DICTIONARY.olmaliq_landmarks) {
    const existing = await db.landmark.findFirst({
      where: { cityId: olmaliq.id, name: lm.official_name },
    });

    if (existing) {
      createdLandmarks[lm.official_name] = existing.id;
    } else {
      const created = await db.landmark.create({
        data: {
          cityId: olmaliq.id,
          name: lm.official_name,
          synonyms: lm.folk_names,
        },
      });
      createdLandmarks[lm.official_name] = created.id;
    }
  }
  console.log(`✅ Seeded ${INITIAL_DICTIONARY.olmaliq_landmarks.length} landmarks for Olmaliq.`);

  // 4. Seed Initial Listings (Gazavik Bahrom)
  const gazavikCat = await db.category.findUnique({ where: { name: 'Gazavik' } });
  const korzinkaLmId = createdLandmarks['Korzinka'];

  if (gazavikCat && korzinkaLmId) {
    const existingBahrom = await db.listing.findFirst({
      where: { cityId: olmaliq.id, phone: '+998901234567' },
    });

    if (!existingBahrom) {
      await db.listing.create({
        data: {
          cityId: olmaliq.id,
          categoryId: gazavikCat.id,
          type: ListingType.USTA,
          name: 'Bahrom',
          phone: '+998901234567',
          primaryLandmarkId: korzinkaLmId,
          workingHours: '08:00 - 18:00',
          badges: ['uyga_boradi', 'kafolat'],
          verification: 'VERIFIED', // ✅ Tasdiqlangan
          completenessScore: 90,
          bayesianRating: 4.4,
          thumbsUpCount: 28,
          thumbsDownCount: 4,
        },
      });
      console.log('✅ Initial Listing "Bahrom (Gazavik)" created.');
    }
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
