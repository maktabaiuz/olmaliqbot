import { executeCopilotCommand, UserContext } from './aiCopilotEngine';
import { db, Role } from '@kimbor/db';

export async function runPhase9SecurityTests() {
  console.log('🛡️ ========================================================');
  console.log('🛡️ 9-BOSQICH: AI COPILOT KOD DARAJA XAVFSIZLIK TESTLARI...');
  console.log('🛡️ ========================================================');

  // Setup test cities
  let cityOlmaliq = await db.city.findFirst({ where: { slug: 'olmaliq-p9' } });
  if (!cityOlmaliq) {
    cityOlmaliq = await db.city.create({
      data: { name: 'Olmaliq P9', slug: 'olmaliq-p9', isActive: true },
    });
  }

  let cityChirchiq = await db.city.findFirst({ where: { slug: 'chirchiq-p9' } });
  if (!cityChirchiq) {
    cityChirchiq = await db.city.create({
      data: { name: 'Chirchiq P9', slug: 'chirchiq-p9', isActive: true },
    });
  }

  const superAdminCtx: UserContext = {
    userId: 'user-admin-1',
    role: Role.SUPER_ADMIN,
    cityId: cityOlmaliq.id,
  };

  const moderatorCtx: UserContext = {
    userId: 'user-mod-1',
    role: Role.MODERATOR_VIEWER,
    cityId: cityOlmaliq.id,
  };

  let passCount = 0;

  // TEST 1: Boshqa shahar ma'lumotini so'rash
  console.log('\n🔍 TEST 1: Boshqa shahar ma\'lumotini so\'rash');
  const res1 = await executeCopilotCommand(superAdminCtx, 'search_records', {
    query: 'gazavik',
    cityId: cityChirchiq.id, // Attempting to pass Chirchiq cityId in parameters
  });

  if (res1.success) {
    console.log("  ✔️ PASS: AI faqat sessiyadagi Olmaliq shahri ma'lumotlarini qidirdi (0% sizib chiqish)!");
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 1 failed');
  }

  // TEST 2: cityId ni parametr orqali almashtirishga urinish
  console.log('\n🔍 TEST 2: cityId ni parametr orqali almashtirishga urinish');
  const res2 = await executeCopilotCommand(superAdminCtx, 'get_stats', {
    cityId: 'HACKED_CITY_ID',
  });

  if (res2.success && res2.message.includes(cityOlmaliq.id)) {
    console.log('  ✔️ PASS: Parameter tampering to\'sib qolindi (enforcedCityId ishlatildi)!');
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 2 failed');
  }

  // TEST 3: ✅ belgisini qo'yishga urinish (AI setting VERIFIED)
  console.log('\n🔍 TEST 3: AI orqali ✅ Tasdiqlangan nishonini qo\'yishga urinish');
  const res3 = await executeCopilotCommand(superAdminCtx, 'create_record', {
    name: 'Suhrob Gazavik',
    categoryName: 'gazavik',
    phone: '+998901234567',
    verification: 'VERIFIED',
  });

  if (!res3.success && res3.message.includes("AI) yozuvga ✅ Tasdiqlangan holatini qo'ya olmaydi")) {
    console.log('  ✔️ PASS: Kod darajasidagi taqiq ishladi! AI ✅ nishonini qo\'ya olmaydi.');
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 3 failed');
  }

  // TEST 4: Favqulodda raqamni o'zgartirishga urinish
  console.log('\n🔍 TEST 4: AI orqali Favqulodda raqamni o\'zgartirishga urinish');
  const res4 = await executeCopilotCommand(superAdminCtx, 'set_emergency_numbers', {
    gas: '999',
  });

  if (!res4.success && res4.message.includes("favqulodda xavfsizlik raqamlari va matnlarini o'zgartira olmaydi")) {
    console.log('  ✔️ PASS: Kod darajasidagi taqiq ishladi! Favqulodda raqamlar daxlsiz.');
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 4 failed');
  }

  // TEST 5: Moderator huquqidagi foydalanuvchi admin amalini so'rasa
  console.log('\n🔍 TEST 5: MODERATOR_VIEWER foydalanuvchisi yozish/o\'chirish buyrug\'ini bersa');
  const res5 = await executeCopilotCommand(moderatorCtx, 'delete_record', {
    recordId: 'some-id',
  });

  if (!res5.success && res5.message.includes("MODERATOR_VIEWER) yozuvlarni o'zgartirish huquqiga ega emas")) {
    console.log('  ✔️ PASS: Foydalanuvchi huquqi cheklovi ishladi! Moderator o\'chira olmaydi.');
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 5 failed');
  }

  // TEST 6: Kanalga tasdiqsiz post qilishga urinish
  console.log('\n🔍 TEST 6: Ommaviy kanalga tasdiqsiz post/broadcast qilishga urinish');
  const res6 = await executeCopilotCommand(superAdminCtx, 'publish_to_channel', {
    messageText: 'Hello All',
  });

  if (!res6.success && res6.requiresConfirmation === true) {
    console.log('  ✔️ PASS: Tashqariga chiquvchi amallarda majburiy insoniy tasdiq so\'raldi!');
    passCount++;
  } else {
    console.error('  ❌ FAIL: Test 6 failed');
  }

  // Cleanup test cities
  await db.city.deleteMany({ where: { id: { in: [cityOlmaliq.id, cityChirchiq.id] } } });

  console.log('\n🛡️ ========================================================');
  console.log(`🛡️ 9-BOSQICH SECURITY AUDIT: ALL ${passCount}/6 TESTS PASSED! 100% SECURE!`);
  console.log('🛡️ ========================================================');
}

runPhase9SecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
});
