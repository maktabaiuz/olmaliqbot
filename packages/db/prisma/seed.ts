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
  for (const cat of INITIAL_DICTIONARY.categories as Array<{ name: string; synonyms: string[]; object_type?: string; group?: string }>) {
    await db.category.upsert({
      where: { name: cat.name },
      update: {
        synonyms: cat.synonyms,
        objectType: (cat.object_type as any) || null,
        group: cat.group || null,
      },
      create: {
        name: cat.name,
        synonyms: cat.synonyms,
        objectType: (cat.object_type as any) || null,
        group: cat.group || null,
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

  // 5. Seed Super Admin — password is NOT seeded here.
  // Admin must go through the password-setup flow on first login.
  // SUPER_ADMIN_TELEGRAM_ID must be set in .env
  const superAdminEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
  if (!superAdminEnv) {
    console.warn('⚠️  SUPER_ADMIN_TELEGRAM_ID not set in environment — skipping admin seed.');
  } else {
    const superAdminId = BigInt(superAdminEnv);
    await db.user.upsert({
      where: { telegramId: superAdminId },
      update: { role: 'SUPER_ADMIN' },
      create: {
        telegramId: superAdminId,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        cityId: olmaliq.id,
        isPasswordSet: false,
        passwordHash: null,
      },
    });
    console.log(`✅ Seeded Super Admin (${superAdminId}). Password NOT set — must complete setup on first login.`);
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
