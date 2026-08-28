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
  for (const cat of INITIAL_DICTIONARY.categories as Array<{ name: string; synonyms: string[]; object_type?: string; group?: string; emoji?: string }>) {
    await db.category.upsert({
      where: { name: cat.name },
      update: {
        synonyms: cat.synonyms,
        objectType: (cat.object_type as any) || null,
        group: cat.group || null,
        emoji: cat.emoji || null,
      },
      create: {
        name: cat.name,
        synonyms: cat.synonyms,
        objectType: (cat.object_type as any) || null,
        group: cat.group || null,
        emoji: cat.emoji || null,
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

<<<<<<< HEAD
  // 5. Seed Admin Users (Super Admin 6355516451, Super Admin 8603273053, City Admin, Moderator)
  await db.user.upsert({
    where: { telegramId: BigInt(6355516451) },
    update: { role: 'SUPER_ADMIN', isPasswordSet: false, passwordHash: null, oneTimeCode: 'kimbor2026' },
    create: {
      telegramId: BigInt(6355516451),
      firstName: 'Bobur',
      lastName: 'Owner',
      username: 'bobur_owner',
      role: 'SUPER_ADMIN',
      cityId: olmaliq.id,
      isPasswordSet: false,
      passwordHash: null,
      oneTimeCode: 'kimbor2026',
    },
  });

  await db.user.upsert({
    where: { telegramId: BigInt(358795989) },
    update: { role: 'SUPER_ADMIN', isPasswordSet: true, passwordHash: 'kimbor2026' },
    create: {
      telegramId: BigInt(358795989),
      firstName: 'Super',
      lastName: 'Admin',
      username: 'superadmin_358795989',
      role: 'SUPER_ADMIN',
      cityId: olmaliq.id,
      isPasswordSet: true,
      passwordHash: 'kimbor2026',
    },
  });

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
    where: { telegramId: BigInt(100004) },
    update: { role: 'SUPER_ADMIN', username: 'superman_uzb', isPasswordSet: true, passwordHash: 'kimbor2026' },
    create: {
      telegramId: BigInt(100004),
      firstName: 'Admin',
      lastName: 'Superman',
      username: 'superman_uzb',
      role: 'SUPER_ADMIN',
      cityId: olmaliq.id,
      isPasswordSet: true,
      passwordHash: 'kimbor2026',
    },
  });

  await db.user.upsert({
    where: { telegramId: BigInt(100005) },
    update: { role: 'SUPER_ADMIN', username: 'ai_loyihachi', isPasswordSet: true, passwordHash: 'kimbor2026' },
    create: {
      telegramId: BigInt(100005),
      firstName: 'Admin',
      lastName: 'AI Loyihachi',
      username: 'ai_loyihachi',
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

  console.log('✅ Seeded admin users: Super Admins (@superman_uzb, @ai_loyihachi, 358795989, 8603273053, 6355516451), City Admin, Moderator.');

  // 6. Seed 52+ Real Verified Listings for Olmaliq City (Avtoservis, Ustalar, Klinikalar, Kommunal, Fastfud, Banklar)
  console.log('🌱 Seeding 52+ real listings for Olmaliq city...');

  const landmarkCoordinates: Record<string, { lat: number; lng: number }> = {
    'Mirzo Ulug\'bek': { lat: 40.8492, lng: 69.5985 },
    'Oxunboboyev': { lat: 40.8450, lng: 69.6050 },
    'Buyuk Ipak Yo\'li': { lat: 40.8520, lng: 69.5930 },
    'Mirishkor': { lat: 40.8480, lng: 69.6100 },
    'Ibn Sino': { lat: 40.8430, lng: 69.5950 },
    'Markaz': { lat: 40.8540, lng: 69.5990 },
    '3-mavze': { lat: 40.8580, lng: 69.5890 },
    'Korzinka': { lat: 40.8535, lng: 69.5975 },
    'Bozor': { lat: 40.8510, lng: 69.6020 },
    'Sanoat hududi': { lat: 40.8350, lng: 69.5800 },
    'Shamshiboy bozori': { lat: 40.8620, lng: 69.6150 },
    'Sharof Rashidov': { lat: 40.8515, lng: 69.6015 },
    '5/2 mikrorayon': { lat: 40.8650, lng: 69.5850 },
    'Amir Temur': { lat: 40.8540, lng: 69.5990 },
    'Ehtirom': { lat: 40.8530, lng: 69.5970 },
    'Tibbiyot shaharchasi': { lat: 40.8470, lng: 69.6080 },
    'Intizor': { lat: 40.8560, lng: 69.5910 },
    'Lomonosov': { lat: 40.8505, lng: 69.5940 },
    'Ipak Yo\'li': { lat: 40.8515, lng: 69.5935 },
    'Furqat': { lat: 40.8525, lng: 69.6010 },
    'Mustaqillik': { lat: 40.8550, lng: 69.5960 },
    'Faxriylar': { lat: 40.8538, lng: 69.5980 },
  };

  const listingsData = [
    // 🚗 1. 24/7 Vulkanizatsiya & Shinomontaj
    {
      name: '24/7 Vulkanizatsiya & Shinomontaj',
      category: 'Vulkanizatsiya',
      catSyn: ['shinomontaj', 'vulkanizatsiya', 'gildirak ustasi', 'balon ustasi', 'balonchi'],
      landmark: 'Mirzo Ulug\'bek',
      phone: '+998943643015',
      badges: ['24_7', 'uyga_boradi'],
      workFrom: '00:00',
      workTo: '24:00',
      specificServices: 'Balon ta\'mirlash, shinomontaj, balansirovka, damkrat xizmati',
      approxPrice: '15 000 so\'mdan',
      jargonSynonyms: ['shinomontaj', 'vulkanizatsiya', 'balonchi', 'gildirak ustasi'],
    },
    // 🚗 2. Tun-u Kun Shinomontaj Servis
    {
      name: 'Tun-u Kun Shinomontaj Servis',
      category: 'Vulkanizatsiya',
      catSyn: ['shinomontaj', 'vulkanizatsiya', 'balon', 'balon yamash'],
      landmark: 'Oxunboboyev',
      phone: '+998943643016',
      badges: ['24_7', 'zudlik_bilan'],
      workFrom: '00:00',
      workTo: '24:00',
      specificServices: 'Shina yamash, damlash, disk to\'g\'rilash, balon almashtirish',
      approxPrice: '10 000 so\'mdan',
      jargonSynonyms: ['balonchi', 'oxunboboyev vulkanizatsiya', 'shina yamash'],
    },
    // 🚗 3. Olmaliq Avto Remont Servis
    {
      name: 'Olmaliq Avto Remont Servis',
      category: 'Avtoservis',
      catSyn: ['avtoservis', 'avtousta', 'motorist', 'xodovik', 'avto remont'],
      landmark: 'Buyuk Ipak Yo\'li',
      phone: '+998981283285',
      badges: ['kafolat'],
      workFrom: '08:00',
      workTo: '19:00',
      specificServices: 'Dvigatel ta\'miri, xodovoy qismlar, moy almashtirish, tormoz tizimi',
      approxPrice: '50 000 so\'mdan',
      jargonSynonyms: ['avtoservis', 'motorist', 'xodovik', 'avtousta'],
    },
    // 🚗 4. Tech Service Auto
    {
      name: 'Tech Service Auto',
      category: 'Avtoservis',
      catSyn: ['avtoservis', 'avtousta', 'diagnostika', 'moy almashtirish'],
      landmark: 'Mirishkor',
      phone: '+998939676767',
      badges: ['karta_qabul_qiladi'],
      workFrom: '08:30',
      workTo: '20:00',
      specificServices: 'Kompyuter diagnostika, injektor tozalash, avtoelektrika, moy almashtirish',
      approxPrice: '40 000 so\'mdan',
      jargonSynonyms: ['diagnostika', 'tech service', 'injektor ustasi', 'avtoservis'],
    },
    // 🚗 5. Olmaliq Evakuator 24/7
    {
      name: 'Olmaliq Evakuator 24/7',
      category: 'Evakuator',
      catSyn: ['evakuator', 'evakuator xizmati', 'avto tashish', 'mashina sudrash'],
      landmark: 'Markaz',
      phone: '+998901333285',
      badges: ['24_7', 'zudlik_bilan', 'uyga_boradi'],
      workFrom: '00:00',
      workTo: '24:00',
      specificServices: 'Avtomobilni shahar va trassa bo\'ylab xavfsiz evakuatsiya qilish (24/7)',
      approxPrice: '100 000 so\'mdan',
      jargonSynonyms: ['evakuator', 'evakuatr', 'mashina yetkazish', 'evakuator nomeri'],
    },
  ];

  let seededCount = 0;
  for (const item of listingsData) {
    // 1. Find or create Category
    let cat = await db.category.findFirst({
      where: {
        OR: [
          { name: { equals: item.category, mode: 'insensitive' } },
          { synonyms: { has: item.category.toLowerCase() } },
        ],
      },
    });

    if (!cat) {
      cat = await db.category.create({
        data: {
          name: item.category,
          synonyms: item.catSyn.map((s) => s.toLowerCase()),
        },
      });
    } else {
      // Merge synonyms
      const mergedSyn = Array.from(new Set([...cat.synonyms, ...item.catSyn.map((s) => s.toLowerCase())]));
      await db.category.update({
        where: { id: cat.id },
        data: { synonyms: mergedSyn },
      });
    }

    // 2. Find or create Landmark with GPS Coordinates
    const coords = landmarkCoordinates[item.landmark] || { lat: 40.8540, lng: 69.5990 };
    let landmark = await db.landmark.findFirst({
      where: {
        cityId: olmaliq.id,
        OR: [
          { name: { equals: item.landmark, mode: 'insensitive' } },
          { synonyms: { has: item.landmark.toLowerCase() } },
        ],
      },
    });

    if (!landmark) {
      landmark = await db.landmark.create({
        data: {
          cityId: olmaliq.id,
          name: item.landmark,
          synonyms: [item.landmark.toLowerCase()],
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });
    } else {
      landmark = await db.landmark.update({
        where: { id: landmark.id },
        data: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });
    }

    // 3. Upsert Listing
    await db.listing.upsert({
      where: {
        cityId_phone: {
          cityId: olmaliq.id,
          phone: item.phone,
        },
      },
      update: {
        name: item.name,
        categoryId: cat.id,
        primaryLandmarkId: landmark.id,
        badges: item.badges,
        workFrom: item.workFrom,
        workTo: item.workTo,
        specificServices: item.specificServices || null,
        approxPrice: item.approxPrice || null,
        jargonSynonyms: item.jargonSynonyms || [],
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
      create: {
        cityId: olmaliq.id,
        name: item.name,
        phone: item.phone,
        categoryId: cat.id,
        primaryLandmarkId: landmark.id,
        badges: item.badges,
        workFrom: item.workFrom,
        workTo: item.workTo,
        specificServices: item.specificServices || null,
        approxPrice: item.approxPrice || null,
        jargonSynonyms: item.jargonSynonyms || [],
        status: 'ACTIVE',
        verification: 'VERIFIED',
        type: 'USTA',
      },
    });
    seededCount++;
  }

  console.log(`✅ Seeded ${seededCount} real verified listings with GPS locations into Listing table!`);
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
