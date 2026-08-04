import { db } from '@kimbor/db';
import { clusterUnresolvedQueries, notifyUsersOnNewListingAdded } from './queryLoop';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(description: string, condition: boolean, details: string = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description} ${details}`);
  }
}

async function runPhase5Tests() {
  console.log('\n======================================================');
  console.log('🧪 5-BOSHQICH: SO\'ROVLAR SIKLI & AUTO-NOTIFICATION TESTLARI');
  console.log('======================================================\n');

  // 1. Create Test Cities (Olmaliq and Chirchiq)
  const olmaliq = await db.city.upsert({
    where: { slug: 'olmaliq-p5' },
    update: {},
    create: { name: 'Olmaliq P5', slug: 'olmaliq-p5' },
  });

  const chirchiq = await db.city.upsert({
    where: { slug: 'chirchiq-p5' },
    update: {},
    create: { name: 'Chirchiq P5', slug: 'chirchiq-p5' },
  });

  // Create Category: Kafelchi
  const kafelCat = await db.category.upsert({
    where: { name: 'Kafelchi' },
    update: { synonyms: ['kafelchi', 'plitkachi'] },
    create: { name: 'Kafelchi', synonyms: ['kafelchi', 'plitkachi'] },
  });

  const landmarkOlmaliq = await db.landmark.create({
    data: { cityId: olmaliq.id, name: 'Korzinka P5' },
  });

  // 2. Seed Unresolved Queries for Olmaliq
  const user1 = BigInt(998901111);
  const user2 = BigInt(998902222);
  const chirchiqUser = BigInt(998903333);

  // User 1 asks for kafelchi ("kafelchi bormi")
  await db.queryLog.create({
    data: {
      cityId: olmaliq.id,
      telegramUserId: user1,
      rawMessage: 'kafelchi bormi?',
      categoryName: 'kafelchi',
      isResolved: false,
    },
  });

  // User 1 asks again ("plitkachi kerak edi")
  await db.queryLog.create({
    data: {
      cityId: olmaliq.id,
      telegramUserId: user1,
      rawMessage: 'plitkachi kerak edi',
      categoryName: 'plitkachi',
      isResolved: false,
    },
  });

  // User 2 asks for kafelchi ("kafel ustasi nomeri")
  await db.queryLog.create({
    data: {
      cityId: olmaliq.id,
      telegramUserId: user2,
      rawMessage: 'kafel ustasi nomeri',
      categoryName: 'kafel ustasi',
      isResolved: false,
    },
  });

  // User 1 also asked for santexnik (Different trade)
  await db.queryLog.create({
    data: {
      cityId: olmaliq.id,
      telegramUserId: user1,
      rawMessage: 'santexnik bor',
      categoryName: 'santexnik',
      isResolved: false,
    },
  });

  // Chirchiq User asks for kafelchi in Chirchiq city
  await db.queryLog.create({
    data: {
      cityId: chirchiq.id,
      telegramUserId: chirchiqUser,
      rawMessage: 'chirchiqda kafelchi kerak',
      categoryName: 'kafelchi',
      isResolved: false,
    },
  });

  console.log('--- 1. So\'rovlarni Birlashtirish (Clustering & Deduping) ---');

  const clusters = await clusterUnresolvedQueries(olmaliq.id);

  assert('Olmaliq so\'rovlari muvaffaqiyatli guruhlandi', clusters.length >= 2);

  const kafelCluster = clusters.find((c) => c.canonicalName.toLowerCase().includes('kafel'));
  const santexnikCluster = clusters.find((c) => c.canonicalName.toLowerCase().includes('santexnik'));

  assert('O\'xshash so\'rovlar ("kafelchi", "plitkachi", "kafel ustasi") bitta kafelchi guruhiga birlashdi', kafelCluster !== undefined && kafelCluster.count === 3);
  assert('Har xil kasblar ("santexnik" va "kafelchi") ALOHIDA qoldi', santexnikCluster !== undefined && santexnikCluster.canonicalName !== kafelCluster?.canonicalName);
  assert('Kafelchi kategoriyasi "bazada bor, bot tanimadi" deb belgilandi', kafelCluster?.isExistingCategory === true);


  console.log('\n--- 2. Avtomatik Xabar Yuborish (Auto-Notification Loop) ---');

  // Admin adds new listing "Alisher Kafelchi" in Olmaliq
  const alisherListing = await db.listing.create({
    data: {
      cityId: olmaliq.id,
      categoryId: kafelCat.id,
      name: 'Alisher Kafelchi',
      phone: '+998907778899',
      primaryLandmarkId: landmarkOlmaliq.id,
      badges: ['uyga_boradi'],
      verification: 'VERIFIED',
      bayesianRating: 4.8,
    },
  });

  // Mock Notification Dispatcher Function
  const dispatchedMessages: { userId: string; text: string }[] = [];
  const mockSendFn = async (userId: bigint, text: string) => {
    dispatchedMessages.push({ userId: userId.toString(), text });
    return true;
  };

  // Trigger Notification Loop for category "kafelchi"
  const notifResult = await notifyUsersOnNewListingAdded({
    cityId: olmaliq.id,
    listingId: alisherListing.id,
    categoryName: 'kafelchi',
    sendNotificationFn: mockSendFn,
  });

  assert('Olmaliq shahridagi 2 ta noyob foydalanuvchiga (user1, user2) xabar yuborildi', notifResult.totalNotified === 2);
  assert('Xabar matnida "Alisher Kafelchi" va "Siz kafelchi so\'ragan edingiz" bor', dispatchedMessages[0]?.text.includes('Alisher Kafelchi') && dispatchedMessages[0]?.text.includes('so\'ragan edingiz'));

  console.log('\n  📢 Yuborilgan Avtomatik Xabar Misoli:');
  console.log('--------------------------------------------------');
  console.log(dispatchedMessages[0]?.text);
  console.log('--------------------------------------------------\n');


  console.log('--- 3. Qayta Xabar Yuborilmasligi (FAQAT 1 MARTA Rule) ---');

  // Trigger Notification Loop SECOND TIME for the same listing/category
  const secondNotifResult = await notifyUsersOnNewListingAdded({
    cityId: olmaliq.id,
    listingId: alisherListing.id,
    categoryName: 'kafelchi',
    sendNotificationFn: mockSendFn,
  });

  assert('Qayta chaqirilganda 0 ta yangi xabar yuborildi (notifiedAt nazorati ✅)', secondNotifResult.totalNotified === 0);


  console.log('\n--- 4. 🔒 Multi-Tenant `city_id` Izolyatsiyasi Sinovi ---');

  const chirchiqPendingLogs = await db.queryLog.findMany({
    where: { cityId: chirchiq.id, isResolved: false, notifiedAt: null },
  });

  assert('Olmaliqqa usta qo\'shilganda Chirchiq foydalanuvchisiga XABAR KETMADI (isResolved=false qoldi ✅)', chirchiqPendingLogs.length === 1);


  // Cleanup Test Data
  await db.queryLog.deleteMany({ where: { cityId: { in: [olmaliq.id, chirchiq.id] } } });
  await db.listing.deleteMany({ where: { cityId: { in: [olmaliq.id, chirchiq.id] } } });
  await db.landmark.deleteMany({ where: { cityId: { in: [olmaliq.id, chirchiq.id] } } });
  await db.city.deleteMany({ where: { id: { in: [olmaliq.id, chirchiq.id] } } });

  console.log('======================================================');
  console.log(`📊 TEST YAKUNI: Jami: ${totalTests} | ✅ O'tdi: ${passedTests} | ❌ Xato: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase5Tests()
  .catch((e) => {
    console.error('❌ Phase 5 test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
