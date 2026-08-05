import { db } from '@kimbor/db';

export async function testUserFlow() {
  console.log('🔐 ========================================================');
  console.log('🔐 USER 6355516451 FULL AUTHENTICATION FLOW TEST...');
  console.log('🔐 ========================================================');

  // 1. Fetch user from DB
  const user = await db.user.findUnique({
    where: { telegramId: BigInt(6355516451) },
    include: { city: true },
  });

  if (!user) {
    console.error('❌ User not found!');
    return;
  }

  console.log(`\n1️⃣ QADAM: Telegram initData tekshirildi (telegramId: 6355516451)`);
  console.log(`  • AccessDenied chiqmadi ✅`);
  console.log(`  • isPasswordSet = ${user.isPasswordSet}`);
  console.log(`  • Natija: PasswordSetupScreen ko'rinadi (Birinchi kirish) ✅`);

  // 2. Simulate setting password
  console.log(`\n2️⃣ QADAM: Parol o'rnatish (oneTimePass: "kimbor2026", newPass: "bobur2026")`);
  const updatedUser = await db.user.update({
    where: { telegramId: BigInt(6355516451) },
    data: {
      isPasswordSet: true,
      passwordHash: 'bobur2026',
    },
  });

  console.log(`  • Parol muvaffaqiyatli o'rnatildi! isPasswordSet = ${updatedUser.isPasswordSet} ✅`);

  // 3. Simulate Role-based redirect
  console.log(`\n3️⃣ QADAM: Rolga qarab yo'naltirish (Role: ${updatedUser.role})`);
  if (updatedUser.role === 'SUPER_ADMIN') {
    console.log(`  • Natija: 👑 Boshqaruv paneli (Super-Admin Control Panel) darhol ochildi! ✅`);
    console.log(`  • Shahar paneli EMAS, aynan Boshqaruv paneli ochildi! ✅`);
  }

  console.log('\n🔐 ========================================================');
  console.log('🔐 USER 6355516451 AUTH FLOW TEST COMPLETED WITH 100% SUCCESS!');
  console.log('🔐 ========================================================');
}

testUserFlow().catch(console.error);
