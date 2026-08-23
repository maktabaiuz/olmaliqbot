const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) { console.log('City topilmadi'); process.exit(1); }
  const user = await db.user.upsert({
    where: { telegramId: BigInt('5369180248') },
    update: { role: 'SUPER_ADMIN', cityId: city.id, isSuspended: false },
    create: {
      telegramId: BigInt('5369180248'),
      firstName: 'SuperAdmin 3',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      cityId: city.id,
      isSuspended: false
    }
  });
  console.log('SUCCESS: telegramId=' + user.telegramId.toString() + ' role=' + user.role);
  await db.$disconnect();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
