import { PrismaClient } from '@prisma/client';
import INITIAL_DICTIONARY from '../../core/src/dictionary/initialDictionary.json';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding categories into database...');

  // 1. Upsert Olmaliq city
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

  // 2. Seed Categories (40+ trade categories & synonyms)
  let catCount = 0;
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
    catCount++;
  }
  console.log(`✅ Seeded ${catCount} trade categories into Category table.`);
  console.log('ℹ️ Landmarks left empty as instructed.');
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
