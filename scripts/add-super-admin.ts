import { db } from '@kimbor/db';

async function addSuperAdmin() {
  const superAdminIds = [BigInt(6355516451), BigInt(8323651390), BigInt(5369180248)];

  console.log('👑 Adding & Verifying Super Admin Accounts in DB...\n');

  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }

  const adminConfig: Record<string, { name: string; loginCode: string }> = {
    '6355516451': { name: 'Bobur SuperAdmin',  loginCode: '635551' },
    '8323651390': { name: 'SuperAdmin 2',       loginCode: '832365' },
    '5369180248': { name: 'SuperAdmin 3',       loginCode: '536918' },
  };

  for (const tgId of superAdminIds) {
    const cfg = adminConfig[tgId.toString()] ?? { name: 'SuperAdmin', loginCode: '000000' };
    const user = await db.user.upsert({
      where: { telegramId: tgId },
      update: {
        role: 'SUPER_ADMIN',
        cityId: city.id,
        isSuspended: false,
        loginCode: cfg.loginCode,
      },
      create: {
        telegramId: tgId,
        firstName: cfg.name,
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        cityId: city.id,
        isSuspended: false,
        loginCode: cfg.loginCode,
      },
    });

    console.log(`✅ Super Admin configured: ID ${user.telegramId} | Name: ${user.firstName} | Role: ${user.role} | City: ${city.name}`);
  }

  console.log('\n🎉 ALL SUPER ADMIN ACCOUNTS PROVISIONED SUCCESSFULLY!');
  process.exit(0);
}

addSuperAdmin().catch(err => {
  console.error('Error adding super admin:', err);
  process.exit(1);
});
