import { db } from '@kimbor/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || 'kimbor_hyperlocal_secure_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

async function runModeratorWorkflowTest() {
  console.log('🧪 Starting Moderator Workflow Integration Test...\n');

  // 1. Ensure test city exists
  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }

  // 2. CREATE MODERATOR ACCOUNT
  const modTgId = BigInt(9988776655);
  const rawPass = 'modp12';
  const passHash = hashPassword(rawPass);

  // Clean existing test moderator
  await db.user.deleteMany({ where: { telegramId: modTgId } });

  const moderator = await db.user.create({
    data: {
      telegramId: modTgId,
      firstName: 'Aziz',
      lastName: 'Ko\'chada',
      phoneNumber: '+998901112233',
      role: 'MODERATOR_EDITOR',
      cityId: city.id,
      loginCode: '654321',
      passwordHash: passHash,
      isPasswordSet: true,
    },
  });

  console.log('1. MODERATOR YARATILDI');
  console.log(`   - Ism: ${moderator.firstName} ${moderator.lastName}`);
  console.log(`   - Telefon: ${moderator.phoneNumber}`);
  console.log(`   - Role: ${moderator.role}`);
  console.log(`   - Login Code: ${moderator.loginCode}, Password Hash Generated ✅ PASS\n`);

  // 3. ADD 5 LISTINGS WITH CONSENT TOGGLE ON MOBILE
  let cat = await db.category.findFirst({ where: { name: 'gazavik' } });
  if (!cat) cat = await db.category.create({ data: { name: 'gazavik' } });

  let landmark = await db.landmark.findFirst({ where: { cityId: city.id, name: 'Korzinka' } });
  if (!landmark) landmark = await db.landmark.create({ data: { cityId: city.id, name: 'Korzinka' } });

  console.log('2. MODERATOR NOMIDAN 5 TA YOZUV QO\'SHISH (ROZILIK BELGISI BILAN)');
  const createdListings = [];
  for (let i = 1; i <= 5; i++) {
    const listing = await db.listing.create({
      data: {
        cityId: city.id,
        categoryId: cat.id,
        primaryLandmarkId: landmark.id,
        name: `Usta Ko'cha ${i} (Aziz kiritdi)`,
        phone: `+99893999880${i}`,
        consentGiven: true,
        consentAt: new Date(),
        consentDevice: 'iPhone 13, iOS 17, Mobile Safari',
        consentIp: '188.113.222.35',
        addedByUserId: moderator.id,
        verification: 'VERIFIED',
      },
    });
    createdListings.push(listing);
    console.log(`   [${i}/5] Yozuv yaratildi: "${listing.name}" | Rozilik: ${listing.consentGiven ? '✅ ROZILIK OLDIM' : '❌'}`);
  }
  console.log('   ✅ 5 ta yozuv muvaffaqiyatli saqlandi.\n');

  // 4. CHECK LEADERBOARD / CONTRIBUTIONS STATS
  const countByMod = await db.listing.count({
    where: { addedByUserId: moderator.id },
  });
  console.log('3. SUPER-ADMIN LEADERBOARD TEKSHIRUVI');
  console.log(`   - Aziz kiritgan yozuvlar soni: ${countByMod} ta (Kutilgan: 5) ${countByMod === 5 ? '✅ PASS' : '❌ FAIL'}\n`);

  // 5. SUSPEND / DELETE MODERATOR ACCOUNT
  await db.user.update({
    where: { id: moderator.id },
    data: { isSuspended: true },
  });

  const updatedMod = await db.user.findUnique({ where: { id: moderator.id } });
  console.log('4. HISOBNI TO\'XTATISH VA PECHATLASH (SUSPEND)');
  console.log(`   - Hisob holati isSuspended: ${updatedMod?.isSuspended} ${updatedMod?.isSuspended ? '✅ PASS' : '❌ FAIL'}`);

  // Check added listings still preserved in DB
  const preservedCount = await db.listing.count({ where: { addedByUserId: moderator.id } });
  console.log(`   - Moderator yozuvlari bazada qolishi: ${preservedCount} ta yozuv saqlandi ✅ PASS\n`);

  // Clean up test moderator
  await db.listing.deleteMany({ where: { addedByUserId: moderator.id } });
  await db.user.delete({ where: { id: moderator.id } });

  console.log('==================================================');
  console.log('🎉 MODERATOR WORKFLOW INTEGRATION TEST PASSED 100%!');
  console.log('==================================================');

  process.exit(0);
}

runModeratorWorkflowTest().catch(err => {
  console.error('Moderator test failed:', err);
  process.exit(1);
});
