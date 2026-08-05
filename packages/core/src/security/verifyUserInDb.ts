import { db } from '@kimbor/db';

async function verifyUser() {
  console.log('🔍 Checking User 6355516451 in Database...');
  const user = await db.user.findUnique({
    where: { telegramId: BigInt(6355516451) },
    include: { city: true },
  });

  if (user) {
    console.log('✅ User found in DB:');
    console.log(`  • ID: ${user.id}`);
    console.log(`  • Telegram ID: ${user.telegramId.toString()}`);
    console.log(`  • Name: ${user.firstName} ${user.lastName}`);
    console.log(`  • Role: ${user.role}`);
    console.log(`  • City: ${user.city?.name} (${user.cityId})`);
    console.log(`  • isPasswordSet: ${user.isPasswordSet}`);
    console.log(`  • oneTimeCode: ${user.oneTimeCode}`);
  } else {
    console.error('❌ User NOT found in DB!');
  }
}

verifyUser().catch(console.error);
