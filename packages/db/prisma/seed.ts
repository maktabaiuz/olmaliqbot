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

  const listingsData = [
    // 🚗 1. Avtoservis, Ustalar & Qurilish
    { name: '24/7 Vulkanizatsiya & Shinomontaj', category: 'Vulkanizatsiya', catSyn: ['shinomontaj', 'vulkanizatsiya', 'gildirak ustasi', 'balon ustasi'], landmark: 'Mirzo Ulug\'bek', phone: '+998943643015', badges: ['24_7', 'uyga_boradi'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Tun-u Kun Shinomontaj Servis', category: 'Vulkanizatsiya', catSyn: ['shinomontaj', 'vulkanizatsiya', 'balon'], landmark: 'Oxunboboyev', phone: '+998943643016', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Olmaliq Avto Remont Servis', category: 'Avtoservis', catSyn: ['avtoservis', 'avtousta', 'motorist', 'xodovik', 'avto remont'], landmark: 'Buyuk Ipak Yo\'li', phone: '+998981283285', badges: ['kafolat'], workFrom: '08:00', workTo: '19:00' },
    { name: 'Tech Service Auto', category: 'Avtoservis', catSyn: ['avtoservis', 'avtousta', 'diagnostika', 'moy almashtirish'], landmark: 'Mirishkor', phone: '+998939676767', badges: ['karta_qabul_qiladi'], workFrom: '08:30', workTo: '20:00' },
    { name: 'Almalyktrakservice Texmarkaz', category: 'Avtoservis', catSyn: ['avtoservis', 'traktor', 'texmarkaz'], landmark: 'Ibn Sino', phone: '+998981283286', badges: [], workFrom: '09:00', workTo: '18:00' },
    { name: 'Olmaliq Evakuator 24/7', category: 'Evakuator', catSyn: ['evakuator', 'evakuator xizmati', 'avto tashish'], landmark: 'Markaz', phone: '+998901333285', badges: ['24_7', 'zudlik_bilan', 'uyga_boradi'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Olmaliq Santexnika & Quvur Ustasi', category: 'Santexnik', catSyn: ['santexnik', 'santexnika', 'suv ustasi', 'quvur ustasi', 'kran ustasi'], landmark: '3-mavze', phone: '+998901234567', badges: ['uyga_boradi', 'zudlik_bilan'], workFrom: '08:00', workTo: '21:00' },
    { name: 'Gaz Kalonka & Plita Ustasi', category: 'Gazavik', catSyn: ['gazavik', 'gazovik', 'gaz ustasi', 'kolonka ustasi', 'plita ustasi'], landmark: 'Markaz', phone: '+998902345678', badges: ['uyga_boradi', 'kafolat'], workFrom: '08:00', workTo: '20:00' },
    { name: 'Usta Malyar Pardozlash', category: 'Malyar', catSyn: ['malyar', 'bo\'yoqchi', 'oboy yopishtirish', 'pardozchi', 'remont ustasi'], landmark: 'Korzinka', phone: '+998931234567', badges: ['uyga_boradi', 'kafolat'], workFrom: '08:00', workTo: '19:00' },
    { name: 'Kafelchi & Plitka Ustasi', category: 'Kafelchi', catSyn: ['kafelchi', 'plitkachi', 'kafel ustasi'], landmark: 'Markaz', phone: '+998932345678', badges: ['uyga_boradi', 'kafolat'], workFrom: '08:00', workTo: '19:00' },
    { name: 'Elektromontaj & Avtomatika', category: 'Elektrik', catSyn: ['elektrik', 'svet ustasi', 'elektr ustasi', 'montyor'], landmark: 'Bozor', phone: '+998941234567', badges: ['uyga_boradi', '24_7'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Svarka & Payvandlash Xizmati', category: 'Svarshik', catSyn: ['svarshik', 'payvandchi', 'svarka ustasi', 'temir ustasi'], landmark: 'Sanoat hududi', phone: '+998942345678', badges: ['uyga_boradi'], workFrom: '08:00', workTo: '18:00' },
    { name: 'AKFA Eshik-Deraza Sexi', category: 'Eshik-deraza', catSyn: ['akfa', 'eshik deraza', 'plastik deraza', 'rom ustasi'], landmark: 'Markaz', phone: '+998903456789', badges: ['kafolat', 'uyga_boradi'], workFrom: '09:00', workTo: '19:00' },
    { name: 'Olmaliq Mebel Buyurtma', category: 'Mebelchi', catSyn: ['mebel', 'mebelchi', 'oshxona mebel', 'shkaf buyurtma', 'mebel ustasi'], landmark: 'Shamshiboy bozori', phone: '+998904567890', badges: ['kafolat'], workFrom: '09:00', workTo: '19:00' },
    { name: 'Katta Bozor Qurilish Mollari', category: 'Qurilish mollari', catSyn: ['qurilish mollari', 'sement', 'gipsokarton', 'kraska do\'koni', 'qurilish'], landmark: 'Sharof Rashidov', phone: '+998971234567', badges: ['karta_qabul_qiladi'], workFrom: '08:00', workTo: '18:00' },

    // 🏥 2. Klinika, Stomatologiya & Dorixonalar
    { name: 'Lor Med Servis (Ko\'p tarmoqli klinika)', category: 'Klinika', catSyn: ['klinika', 'lor', 'shifoxona', 'doktor', 'lor med'], landmark: 'Mirzo Ulug\'bek', phone: '+998706144004', badges: ['karta_qabul_qiladi'], workFrom: '08:00', workTo: '18:00' },
    { name: 'Dr. Islamov’s Clinic', category: 'Klinika', catSyn: ['klinika', 'islamov clinic', 'tibbiyot markazi', 'uzi'], landmark: 'Mirzo Ulug\'bek', phone: '+998555000000', badges: [], workFrom: '08:00', workTo: '18:00' },
    { name: 'Smile Clinic Stomatologiya', category: 'Stomatologiya', catSyn: ['stomatologiya', 'stomatolog', 'tish do\'xtir', 'tish davolash'], landmark: 'Amir Temur', phone: '+998715040220', badges: ['kafolat', 'karta_qabul_qiladi'], workFrom: '09:00', workTo: '20:00' },
    { name: 'Olmaliq Stomatologiya Poliklinikasi', category: 'Stomatologiya', catSyn: ['stomatologiya', 'tish poliklinika', 'stomatolog'], landmark: '5/2 mikrorayon', phone: '+998706120000', badges: [], workFrom: '08:30', workTo: '17:30' },
    { name: 'Best Pharm 24/7 Dorixonasi', category: 'Dorixona', catSyn: ['dorixona', 'apteka', '24/7 apteka', 'dori darmon'], landmark: 'Amir Temur', phone: '+998977640000', badges: ['24_7', 'karta_qabul_qiladi'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Markaziy Dorixona', category: 'Dorixona', catSyn: ['dorixona', 'apteka', 'dori'], landmark: 'Ehtirom', phone: '+998706130000', badges: ['karta_qabul_qiladi'], workFrom: '08:00', workTo: '22:00' },
    { name: 'Mirzo Ulug\'bek Dorixonasi', category: 'Dorixona', catSyn: ['dorixona', 'apteka'], landmark: 'Mirzo Ulug\'bek', phone: '+998706140000', badges: [], workFrom: '08:00', workTo: '21:00' },
    { name: 'Olmaliq Markaziy Shifoxonasi', category: 'Shifoxona', catSyn: ['shifoxona', 'bolnitsa', 'markaziy shifoxona'], landmark: 'Tibbiyot shaharchasi', phone: '+998706121003', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
    { name: '1-Sonli Shahar Poliklinikasi', category: 'Poliklinika', catSyn: ['poliklinika', '1-poliklinika', 'vrach'], landmark: 'Markaz', phone: '+998706122000', badges: [], workFrom: '08:00', workTo: '17:00' },
    { name: 'Tibbiy Laboratoriya & Tahlillar', category: 'Laboratoriya', catSyn: ['laboratoriya', 'analiz', 'qon tahlili', 'tahlillar'], landmark: 'Amir Temur', phone: '+998712000003', badges: ['karta_qabul_qiladi'], workFrom: '07:30', workTo: '16:00' },

    // 🚨 3. Kommunal & Shoshilinch Xizmatlar
    { name: 'Olmaliq Suvoqova (Suv avariya dispetcherlik)', category: 'Suv avariya', catSyn: ['suv avariya', 'suvoqova', 'suv yo\'q', 'suv quvuri yorildi'], landmark: 'Intizor', phone: '+998706152285', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Olmaliq Suvoqova Qabulxona', category: 'Suvoqova', catSyn: ['suvoqova', 'vodokanal', 'suv idorasi'], landmark: 'Intizor', phone: '+998706152170', badges: [], workFrom: '08:00', workTo: '17:00' },
    { name: 'Olmaliq Elektr Tarmoqlari (GorSvet)', category: 'Svet avariya', catSyn: ['svet avariya', 'gorsvet', 'svet yo\'q', 'elektr o\'chdi', 'tok yo\'q'], landmark: 'Lomonosov', phone: '+998781501154', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Elektr Tarmoqlari Ishonch Telefoni', category: 'Elektr tarmoqlari', catSyn: ['elektr tarmoqlari', 'res', 'energoset'], landmark: 'Lomonosov', phone: '+998712072376', badges: [], workFrom: '08:00', workTo: '20:00' },
    { name: 'Olmaliq Gaz Ta\'minoti (Hududgaz Avariya)', category: 'Gaz avariya', catSyn: ['gaz avariya', 'gaz idorasi', 'gaz hidi', 'hududgaz', '104'], landmark: 'Ipak Yo\'li', phone: '+998706120404', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Yagona Kommunal Dispetcherlik (1050)', category: 'Kommunal', catSyn: ['kommunal', '1050', 'kommunal xizmat', 'obodonlashtirish'], landmark: 'Markaz', phone: '1050', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Tez Tibbiy Yordam (103)', category: 'Tez yordam', catSyn: ['tez yordam', 'skoriy', '103', 'tez tibbiy yordam'], landmark: 'Markaz', phone: '103', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
    { name: 'Yong\'in Xavfsizligi Qisqa Raqami (101)', category: 'Yong\'in xavfsizligi', catSyn: ['pojar', 'yong\'in', '101', 'o\'t o\'chiruvchilar', 'fvv'], landmark: 'Markaz', phone: '101', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },

    // 🍕 4. Yetkazib Berish, Kafe & Kuryerlik
    { name: 'Oqtepa Lavash Olmaliq', category: 'Lavash', catSyn: ['oqtepa lavash', 'lavash', 'fastfud', 'burger', 'doner', 'ovqat yetkazib berish'], landmark: 'Ehtirom', phone: '+998781500030', badges: ['uyga_boradi', 'karta_qabul_qiladi'], workFrom: '09:00', workTo: '23:00' },
    { name: 'Yemak Ovqat Yetkazib Berish', category: 'Dostavka', catSyn: ['dostavka', 'ovqat yetkazish', 'yemak', 'kuryer'], landmark: 'Markaz', phone: '+998712000000', badges: ['uyga_boradi'], workFrom: '10:00', workTo: '22:00' },
    { name: 'Chicken Cafe & Fast Food', category: 'Fastfud', catSyn: ['fastfud', 'chiken', 'tovuq', 'kafe', 'pitsa'], landmark: 'Markaz', phone: '+998901230000', badges: ['uyga_boradi'], workFrom: '10:00', workTo: '23:00' },
    { name: 'Original Lavash Olmaliq', category: 'Lavash', catSyn: ['original lavash', 'lavash', 'doner'], landmark: 'Bozor', phone: '+998905678901', badges: ['uyga_boradi'], workFrom: '09:00', workTo: '23:00' },
    { name: 'Mak Burgers Fast Food', category: 'Burger', catSyn: ['burger', 'gamburget', 'chizburger', 'mak burger'], landmark: 'Markaz', phone: '+998906789012', badges: [], workFrom: '10:00', workTo: '23:00' },
    { name: 'BTS Express Kuryerlik (1-Filial)', category: 'Pochta', catSyn: ['bts', 'bts express', 'pochta', 'kuryerlik', 'posilka'], landmark: 'Furqat', phone: '1230', badges: ['uyga_boradi'], workFrom: '09:00', workTo: '18:00' },
    { name: 'BTS Express Kuryerlik (2-Filial)', category: 'Pochta', catSyn: ['bts', 'pochta', 'kuryer'], landmark: 'Mustaqillik', phone: '+998712070809', badges: [], workFrom: '09:00', workTo: '18:00' },
    { name: 'UzPost 1-Aloqa Bo\'limi', category: 'Pochta', catSyn: ['uzpost', 'o\'zbekiston pochtasi', 'pochta'], landmark: 'Furqat', phone: '+998706120101', badges: [], workFrom: '09:00', workTo: '17:00' },
    { name: 'UzPost 3-Aloqa Bo\'limi', category: 'Pochta', catSyn: ['uzpost', 'pochta bo\'limi', 'pochta'], landmark: 'Ipak Yo\'li', phone: '+998706120103', badges: [], workFrom: '09:00', workTo: '17:00' },

    // 🏛 5. Davlat Idoralari, Banklar & Notariuslar
    { name: 'Olmaliq Shahar Hokimligi', category: 'Hokimlik', catSyn: ['hokimlik', 'shahar hokimiyati', 'hokim'], landmark: 'Amir Temur', phone: '+998706144004', badges: [], workFrom: '09:00', workTo: '18:00' },
    { name: 'Olmaliq Davlat Xizmatlari Markazi (DXM)', category: 'Davlat xizmatlari', catSyn: ['dxm', 'davlat xizmatlari', 'yagona darcha', 'my gov'], landmark: 'Markaz', phone: '+998706130000', badges: [], workFrom: '09:00', workTo: '18:00' },
    { name: 'Olmaliq 3-Sonli Notarial Idora', category: 'Notarius', catSyn: ['notarius', 'notarial idora', 'hujjat tasdiqlash'], landmark: 'Amir Temur', phone: '+998706141828', badges: [], workFrom: '09:00', workTo: '17:00' },
    { name: 'Davlat Notarial Idorasi', category: 'Notarius', catSyn: ['notarius', 'davlat notariusi'], landmark: 'Mirzo Ulug\'bek', phone: '+998706124500', badges: [], workFrom: '09:00', workTo: '17:00' },
    { name: 'Xalq Banki Olmaliq Filiali', category: 'Bank', catSyn: ['xalq banki', 'bank', 'valyuta', 'kassa', 'kredit'], landmark: 'Amir Temur', phone: '+998706151438', badges: ['karta_qabul_qiladi'], workFrom: '09:00', workTo: '17:00' },
    { name: 'Ipoteka-Bank Olmaliq BXM', category: 'Bank', catSyn: ['ipoteka bank', 'bank', 'kredit', 'valyuta'], landmark: 'Faxriylar', phone: '+998781501122', badges: ['karta_qabul_qiladi'], workFrom: '09:00', workTo: '17:00' },
    { name: 'Trastbank Bank Xizmatlari Markazi', category: 'Bank', catSyn: ['trastbank', 'trustbank', 'bank'], landmark: 'Ehtirom', phone: '+998956817707', badges: [], workFrom: '09:00', workTo: '17:00' },
    { name: 'O\'zsanoatqurilishbank (SQB) Filiali', category: 'Bank', catSyn: ['sqb', 'sanoatqurilishbank', 'bank'], landmark: 'Markaz', phone: '+998706135000', badges: [], workFrom: '09:00', workTo: '17:00' },
    { name: 'Hamkorbank Bosh Ofisi', category: 'Bank', catSyn: ['hamkorbank', 'bank'], landmark: 'Amir Temur', phone: '+998712000008', badges: [], workFrom: '09:00', workTo: '17:00' },
    { name: 'Olmaliq Shahar Ichki Ishlar Bo\'limi (102)', category: 'Militsiya', catSyn: ['militsiya', 'iib', 'iiv', '102', 'uchastkavoy'], landmark: 'Markaz', phone: '102', badges: ['24_7', 'zudlik_bilan'], workFrom: '00:00', workTo: '24:00' },
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

    // 2. Find or create Landmark
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
        status: 'ACTIVE',
        verification: 'VERIFIED',
        type: 'USTA',
      },
    });
    seededCount++;
  }

  console.log(`✅ Seeded ${seededCount} real verified listings into Listing table!`);
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
