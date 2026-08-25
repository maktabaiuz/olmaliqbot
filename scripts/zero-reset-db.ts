import { db } from '@kimbor/db';

async function main() {
  console.log("==========================================");
  console.log("💥 STARTING FULL DATABASE 0-RESET PROCESS...");
  console.log("==========================================");

  // 1. Delete dependent tables first
  console.log("1. Clearing Reviews, Histories, Daily Checks, Corrections, Audit Logs, Query Logs...");
  await db.review.deleteMany({});
  await db.listingHistory.deleteMany({});
  await db.dailyCheck.deleteMany({});
  await db.correction.deleteMany({});
  await db.auditLog.deleteMany({});
  await db.queryLog.deleteMany({});

  // 2. Delete Candidates, Payments, Category Requests
  console.log("2. Clearing Candidates, Payments, Category Requests...");
  await db.candidate.deleteMany({});
  await db.payment.deleteMany({});
  await db.categoryRequest.deleteMany({});

  // 3. Delete Listings
  console.log("3. Clearing all Listings...");
  await db.listing.deleteMany({});

  // 4. Delete Landmarks and Categories
  console.log("4. Clearing Landmarks and Categories...");
  await db.landmark.deleteMany({});
  await db.category.deleteMany({});

  // 5. Ensure City 'Olmaliq' exists
  console.log("5. Setting up clean City: Olmaliq...");
  let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!city) {
    city = await db.city.create({
      data: {
        name: 'Olmaliq',
        slug: 'olmaliq',
        isActive: true,
        planType: 'ASOSCHI',
      },
    });
  }

  // 6. Delete all Non-Admin users and provision Super Admins
  console.log("6. Provisioning Super Admins (6355516451 & 8323651390)...");
  await db.user.deleteMany({
    where: {
      telegramUserId: {
        notIn: [BigInt(6355516451), BigInt(8323651390)],
      },
    },
  });

  const superAdminIds = [BigInt(6355516451), BigInt(8323651390)];
  for (const tgId of superAdminIds) {
    const existing = await db.user.findUnique({
      where: { telegramUserId: tgId },
    });
    if (existing) {
      await db.user.update({
        where: { telegramUserId: tgId },
        data: {
          role: 'SUPER_ADMIN',
          cityId: city.id,
          isActive: true,
        },
      });
    } else {
      await db.user.create({
        data: {
          telegramUserId: tgId,
          role: 'SUPER_ADMIN',
          cityId: city.id,
          firstName: 'SuperAdmin',
          isActive: true,
        },
      });
    }
  }

  console.log("==========================================");
  console.log("✅ DATABASE SUCCESSFULLY RESET TO 0-MODE!");
  console.log("==========================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
