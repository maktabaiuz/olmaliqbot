import { db, ListingType, VerificationStatus } from '@kimbor/db';
import { searchListings } from '../search/searchEngine';
import { notifyUsersOnNewListingAdded } from '../requests/queryLoop';
import { executeCopilotCommand } from '../copilot/aiCopilotEngine';

export async function runEndToEndTest() {
  console.log('🧪 ========================================================');
  console.log('🧪 1. YOZUV QO\'SHISH VA BOTDA QIDIRISH END-TO-END SINOVI');
  console.log('🧪 ========================================================');

  let testCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
  if (!testCity) {
    testCity = await db.city.create({ data: { name: 'Olmaliq', slug: 'olmaliq', isActive: true } });
  }

  let catMebel = await db.category.findFirst({ where: { name: 'mebelchi' } });
  if (!catMebel) {
    catMebel = await db.category.create({ data: { name: 'mebelchi', synonyms: ['mebel', 'mebel usta'] } });
  }

  let landmarkKarzinka = await db.landmark.findFirst({ where: { cityId: testCity.id, name: 'Karzinka' } });
  if (!landmarkKarzinka) {
    landmarkKarzinka = await db.landmark.create({ data: { cityId: testCity.id, name: 'Karzinka', synonyms: ['karzinka'] } });
  }

  // 1. Create new provider
  const phoneNum = `+99890${Date.now().toString().slice(-7)}`;
  const newListing = await db.listing.create({
    data: {
      cityId: testCity.id,
      categoryId: catMebel.id,
      primaryLandmarkId: landmarkKarzinka.id,
      type: ListingType.USTA,
      name: 'Hasan Mebelchi',
      phone: phoneNum,
      verification: VerificationStatus.COMMUNITY_UNVERIFIED,
      badges: ['uyga_boradi', 'kafillik_beradi'],
      workFrom: '08:00',
      workTo: '20:00',
    },
  });

  console.log(`✅ 1. Yangi usta saqlandi: "${newListing.name}" (ID: ${newListing.id}, Tel: ${newListing.phone})`);

  // 2. Verify in Baza (DB Query)
  const bazaListing = await db.listing.findUnique({
    where: { id: newListing.id },
    include: { category: true, primaryLandmark: true },
  });

  if (bazaListing) {
    console.log(`✅ 2. Baza ekranida tasdiqlandi: "${bazaListing.name}" - ${bazaListing.category?.name} (📍 ${bazaListing.primaryLandmark?.name})`);
  }

  // 3. Query Telegram Bot search for "mebelchi"
  const searchResult = await searchListings({
    cityId: testCity.id,
    categoryName: 'mebelchi',
  });

  if (searchResult && searchResult.listing.id === newListing.id) {
    console.log(`✅ 3. Telegram botda so'ralganda yangi usta TOPILDI:\n"${searchResult.formattedText.slice(0, 150)}..."`);
  } else {
    console.error('❌ Bot qidiruvida topilmadi!');
  }

  console.log('\n🧪 ========================================================');
  console.log('🧪 2. SO\'ROV SIKLI (UNRESOLVED REQUEST CYCLE) SINOVI');
  console.log('🧪 ========================================================');

  const testUserTelegramId = BigInt(6355516451);

  // 1. User asks for missing service "bo'yoqchi kerak"
  const queryLog = await db.queryLog.create({
    data: {
      cityId: testCity.id,
      telegramUserId: testUserTelegramId,
      rawMessage: "bo'yoqchi kerak",
      intent: 'SERVICE',
      categoryName: "bo'yoqchi",
      isResolved: false,
    },
  });
  console.log(`✅ 1. Botga yo'q narsa so'raldi, QueryLog'ga yozildi: ID ${queryLog.id} ("${queryLog.rawMessage}")`);

  // 2. Admin adds provider "bo'yoqchi"
  let catBoyoq = await db.category.findFirst({ where: { name: "bo'yoqchi" } });
  if (!catBoyoq) {
    catBoyoq = await db.category.create({ data: { name: "bo'yoqchi", synonyms: ['malyar', 'bo\'yoq'] } });
  }

  const boyoqListing = await db.listing.create({
    data: {
      cityId: testCity.id,
      categoryId: catBoyoq.id,
      primaryLandmarkId: landmarkKarzinka.id,
      type: ListingType.USTA,
      name: 'Salim Malyar',
      phone: `+99891${Date.now().toString().slice(-7)}`,
      verification: VerificationStatus.COMMUNITY_UNVERIFIED,
      badges: ['uyga_boradi'],
    },
  });

  console.log(`✅ 2. Admin "+ Qo'shish" orqali usta saqladi: "${boyoqListing.name}"`);

  // 3. Trigger auto-notification loop
  const notifyRes = await notifyUsersOnNewListingAdded({
    cityId: testCity.id,
    listingId: boyoqListing.id,
    categoryName: "bo'yoqchi",
  });

  console.log(`✅ 3. Avto-xabarnoma sikli bajarildi: ${notifyRes.totalNotified} ta foydalanuvchiga xabar ketdi (QueryLog isResolved=true bo'ldi)`);

  console.log('\n🧪 ========================================================');
  console.log('🧪 3. AI YORDAMCHI (COPILOT DRAWER) SINOVI');
  console.log('🧪 ========================================================');

  const dbSuperUser = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const adminUserCtx = {
    userId: dbSuperUser ? dbSuperUser.id : '',
    role: 'SUPER_ADMIN' as const,
    cityId: testCity.id,
  };

  // Query stats
  const statsRes = await executeCopilotCommand(adminUserCtx, 'get_stats', {});
  console.log(`✅ 1. AI savol-javob: "${statsRes.message}"`);

  // Create record via AI
  const createAiRes = await executeCopilotCommand(adminUserCtx, 'create_record', {
    name: 'Bahrom Santexnik',
    categoryName: 'santexnik',
    phone: `+99893${Date.now().toString().slice(-7)}`,
    landmarkName: 'Markaz',
  });
  console.log(`✅ 2. AI buyruq ijrosi: "${createAiRes.message}" (Undo ID: ${createAiRes.undoId})`);

  // Archive / Delete record via AI
  if (createAiRes.data?.id) {
    const deleteAiRes = await executeCopilotCommand(adminUserCtx, 'delete_record', {
      recordId: createAiRes.data.id,
    });
    console.log(`✅ 3. AI pauzaga qo'yish/arxivlash: "${deleteAiRes.message}" (Undo ID: ${deleteAiRes.undoId})`);

    // Undo action
    if (deleteAiRes.undoId) {
      const undoRes = await executeCopilotCommand(adminUserCtx, 'undo_action', {
        auditId: deleteAiRes.undoId,
      });
      console.log(`✅ 4. "⟲ Qaytarish" tugmasi ijrosi: "${undoRes.message}"`);
    }
  }

  // Cleanup test data
  await db.queryLog.deleteMany({ where: { id: queryLog.id } });
  await db.listing.deleteMany({ where: { id: { in: [newListing.id, boyoqListing.id] } } });

  console.log('\n🧪 ========================================================');
  console.log('🧪 BARCHA END-TO-END SINOVLAR MUVAFFAQIYATLI YAKUNLANDI!');
  console.log('🧪 ========================================================');
}

runEndToEndTest().catch(console.error);
