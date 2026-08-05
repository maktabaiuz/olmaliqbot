import { PrismaClient } from '@prisma/client';
import INITIAL_DICTIONARY from '../../core/src/dictionary/initialDictionary.json';
import { EMERGENCY_TEMPLATES } from '../../core/src/emergency/templates';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding categories and emergency messages into database...');

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

  // 3. Seed BotMessage table with emergency safety templates (isEmergency = true)
  let emergencyCount = 0;
  for (const [key, data] of Object.entries(EMERGENCY_TEMPLATES)) {
    await db.botMessage.upsert({
      where: { key: `emergency_${key}` },
      update: {
        textLatin: data.templates.lotin,
        textCyrillic: data.templates.kirill,
        textRussian: data.templates.rus,
        isEmergency: true,
      },
      create: {
        key: `emergency_${key}`,
        textLatin: data.templates.lotin,
        textCyrillic: data.templates.kirill,
        textRussian: data.templates.rus,
        isEmergency: true,
      },
    });
    emergencyCount++;
  }
  console.log(`✅ Seeded ${emergencyCount} emergency templates into BotMessage table (isEmergency = true).`);

  // 4. Seed sample local emergency numbers for Olmaliq
  await db.emergencyNumber.upsert({
    where: { cityId_key: { cityId: olmaliq.id, key: 'mahalliy_gaz' } },
    update: { phoneNumber: '+998 70 612 04 04' },
    create: {
      cityId: olmaliq.id,
      key: 'mahalliy_gaz',
      label: 'Olmaliq Gaz Avariya',
      phoneNumber: '+998 70 612 04 04',
    },
  });

  // 5. Seed Admin Users (Super Admin, City Admin, Moderator)
  await db.user.upsert({
    where: { telegramId: BigInt(8603273053) },
    update: { role: 'SUPER_ADMIN', isPasswordSet: true, passwordHash: 'kimbor2026' },
    create: {
      telegramId: BigInt(8603273053),
      firstName: 'Bobur',
      lastName: 'SuperAdmin',
      username: 'bobur_admin',
      role: 'SUPER_ADMIN',
      cityId: olmaliq.id,
      isPasswordSet: true,
      passwordHash: 'kimbor2026',
    },
  });

  await db.user.upsert({
    where: { telegramId: BigInt(100002) },
    update: { role: 'CITY_ADMIN', isPasswordSet: true, passwordHash: 'kimbor2026' },
    create: {
      telegramId: BigInt(100002),
      firstName: 'Sardor',
      lastName: 'CityAdmin',
      username: 'sardor_olmaliq',
      role: 'CITY_ADMIN',
      cityId: olmaliq.id,
      isPasswordSet: true,
      passwordHash: 'kimbor2026',
    },
  });

  await db.user.upsert({
    where: { telegramId: BigInt(100003) },
    update: { role: 'MODERATOR_VIEWER', isPasswordSet: true, passwordHash: 'kimbor2026' },
    create: {
      telegramId: BigInt(100003),
      firstName: 'Alisher',
      lastName: 'Moderator',
      username: 'alisher_mod',
      role: 'MODERATOR_VIEWER',
      cityId: olmaliq.id,
      isPasswordSet: true,
      passwordHash: 'kimbor2026',
    },
  });

  console.log('✅ Seeded 3 admin users: Super Admin (8603273053), City Admin (100002), Moderator (100003).');
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
