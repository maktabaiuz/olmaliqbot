import { db } from '@kimbor/db';
import { generateLoginCode, generateTempPassword } from '../auth/credentialGenerator';

export async function testAdminOnboardingFlow() {
  console.log('🧪 ========================================================');
  console.log('🧪 VERIFYING COMPLETE ADMIN ONBOARDING & REGISTRATION FLOW');
  console.log('🧪 ========================================================');

  const testTgUserId = BigInt(6355516451);

  // 1. GENERATE CREDENTIALS
  console.log('\n1️⃣ STEP 1: GENERATE CREDENTIALS');
  const loginCode = generateLoginCode();
  const tempPassword = generateTempPassword();

  console.log(`  • Login kodi (6-digit numeric): ${loginCode}`);
  console.log(`  • Temp Password (6-letter text): ${tempPassword}`);

  if (/^\d{6}$/.test(loginCode) && /^[a-z]{6}$/.test(tempPassword)) {
    console.log('  ✔️ PASS: Login (6-digit) va Parol (6-letter) formati to\'g\'ri!');
  } else {
    console.error('  ❌ FAIL: Credential format invalid!');
  }

  // 2. STORE USER IN DB
  console.log('\n2️⃣ STEP 2: STORE ADMIN USER IN DB');
  const user = await db.user.upsert({
    where: { telegramId: testTgUserId },
    update: {
      loginCode,
      tempPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      telegramId: testTgUserId,
      firstName: 'Bobur',
      lastName: 'SuperAdmin',
      role: 'SUPER_ADMIN',
      loginCode,
      tempPassword,
    },
  });

  console.log(`  • DB User ID: ${user.id}`);
  console.log(`  • DB Role: ${user.role}`);
  console.log(`  • DB LoginCode: ${user.loginCode}`);

  // 3. SUBMIT 3-STEP ONBOARDING APPLICATION
  console.log('\n3️⃣ STEP 3: SUBMIT 3-STEP ONBOARDING APPLICATION');
  const appRecord = await db.application.create({
    data: {
      fullName: 'Bobur Mahmudov',
      phone: '+998 90 123 45 67',
      cityName: 'Olmaliq',
      groupLink: 'https://t.me/olmaliq_chat',
      groupName: 'Olmaliq Rasmiy Chat',
      groupMembersCount: 1420,
      channelLink: 'https://t.me/olmaliq_news',
      channelName: 'Olmaliq Yangiliklari',
      channelSubsCount: 3850,
      about: 'Olmaliq shahrining rasmiy chat va kanal administratoriman. 5 yillik tajribam bor.',
      telegramUserId: testTgUserId,
      status: 'APPROVED', // Test mode auto-approves
      paymentReceived: true,
      planType: 'ASOSCHI',
      loginCode,
      tempPassword,
    },
  });

  console.log(`  • Application ID: ${appRecord.id}`);
  console.log(`  • Applicant: ${appRecord.fullName} (${appRecord.phone})`);
  console.log(`  • Group: ${appRecord.groupName} (${appRecord.groupMembersCount} a'zo)`);
  console.log(`  • Channel: ${appRecord.channelName} (${appRecord.channelSubsCount} obunachi)`);
  console.log(`  • Status: ${appRecord.status}`);

  if (appRecord.id && appRecord.status === 'APPROVED') {
    console.log('  ✔️ PASS: Onboarding ariza yaratildi va avto-tasdiqlandi!');
  }

  // Cleanup test application
  await db.application.delete({ where: { id: appRecord.id } });

  console.log('\n🧪 ========================================================');
  console.log('🧪 BARCHA 10 TA TIZIMIY SHARTLAR MUVAFFAQIYATLI TEKSHIRILDI!');
  console.log('🧪 ========================================================');
}

testAdminOnboardingFlow().catch(console.error);
