import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { classifyQuery } from '../filter/aiClassifier';
import { searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';

// User session state map for multi-step wizards in private chat
const userSessions: Record<number, {
  step?: 'CITY_SELECT' | 'CANDIDATE_NAME' | 'CANDIDATE_CAT' | 'CANDIDATE_PHONE' | 'CANDIDATE_LANDMARK' | 'FRANCHISE_NAME' | 'FRANCHISE_PHONE' | 'FRANCHISE_CITY' | 'FRANCHISE_LINK';
  cityId?: string;
  cityName?: string;
  candidateData?: { name?: string; category?: string; phone?: string; landmark?: string };
  franchiseData?: { name?: string; phone?: string; city?: string; link?: string };
}> = {};

export async function handleDirectMessage(ctx: Context, defaultCityId: string) {
  const messageText = ctx.message?.text?.trim();
  if (!messageText || !ctx.from) return;

  const userId = ctx.from.id;
  const username = (ctx.from.username || '').toLowerCase().replace('@', '');
  const telegramUserIdBigInt = BigInt(userId);
  const SUPER_ADMIN_IDS = [BigInt(358795989), BigInt(6355516451), BigInt(8603273053)];
  const SUPER_ADMIN_USERNAMES = ['superman_uzb', 'ai_loyihachi', 'bobur_owner', 'bobur_admin'];
  const isSuperAdmin = SUPER_ADMIN_IDS.includes(telegramUserIdBigInt) || SUPER_ADMIN_USERNAMES.includes(username);

  // Auto-upsert Telegram User details into DB
  if (messageText === '/deploy' && isSuperAdmin) {
    const { exec } = require('child_process');
    await ctx.reply('🔄 Serverda yangilanish va deploy boshlandi! ~30 soniyada yangilanadi...');
    exec('cd /root/kimbor || cd kimbor && git pull origin main && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml build --no-cache && docker compose -f docker-compose.prod.yml up -d', (err: any, stdout: any, stderr: any) => {
      console.log('Bot Deploy command output:', stdout, stderr);
    });
    return;
  }
  try {
    const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
    await db.user.upsert({
      where: { telegramId: telegramUserIdBigInt },
      update: {
        name: fullName,
        username: ctx.from.username || null,
        role: isSuperAdmin ? 'SUPER_ADMIN' : undefined,
      },
      create: {
        telegramId: telegramUserIdBigInt,
        name: fullName,
        username: ctx.from.username || null,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        cityId: defaultCityId,
      },
    });
  } catch (err) {
    console.error('User upsert error:', err);
  }

  // Retrieve user session
  let session = userSessions[userId];
  if (!session) {
    session = { cityId: defaultCityId };
    userSessions[userId] = session;
  }

  // Handle City Selection Reply Buttons
  if (messageText === '🏙 Olmaliq' || messageText === '🏙️ Olmaliq') {
    let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
    session.cityId = city ? city.id : defaultCityId;
    session.cityName = 'Olmaliq';
    session.step = undefined;

    const dbUser = await db.user.findUnique({ where: { telegramId: telegramUserIdBigInt } });
    const hasAdminAccess = isSuperAdmin || (dbUser && dbUser.role !== 'USER');

    await sendMainMenu(ctx, 'Olmaliq', !!hasAdminAccess);
    return;
  }

  if (messageText === '🏙 Chirchiq' || messageText === '🏙️ Chirchiq') {
    let city = await db.city.findFirst({ where: { slug: 'chirchiq' } });
    if (!city) {
      city = await db.city.create({ data: { name: 'Chirchiq', slug: 'chirchiq', isActive: true } });
    }
    session.cityId = city.id;
    session.cityName = 'Chirchiq';
    session.step = undefined;

    const dbUser = await db.user.findUnique({ where: { telegramId: telegramUserIdBigInt } });
    const hasAdminAccess = isSuperAdmin || (dbUser && dbUser.role !== 'USER');

    await sendMainMenu(ctx, 'Chirchiq', !!hasAdminAccess);
    return;
  }

  if (messageText === '🏙 Angren' || messageText === '🏙️ Angren') {
    let city = await db.city.findFirst({ where: { slug: 'angren' } });
    if (!city) {
      city = await db.city.create({ data: { name: 'Angren', slug: 'angren', isActive: true } });
    }
    session.cityId = city.id;
    session.cityName = 'Angren';
    session.step = undefined;

    const dbUser = await db.user.findUnique({ where: { telegramId: telegramUserIdBigInt } });
    const hasAdminAccess = isSuperAdmin || (dbUser && dbUser.role !== 'USER');

    await sendMainMenu(ctx, 'Angren', !!hasAdminAccess);
    return;
  }

  if (messageText === '🌐 Boshqa') {
    await ctx.reply('Bu shaharda bot hali yo\'q.');
    return;
  }

  // 1. COMMAND: /start
  if (messageText === '/start') {
    session.step = 'CITY_SELECT';

    // Auto-grant SUPER_ADMIN if SuperAdmin
    if (isSuperAdmin) {
      const olmaliqCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
      await db.user.upsert({
        where: { telegramId: telegramUserIdBigInt },
        update: { role: 'SUPER_ADMIN', username: ctx.from.username || undefined },
        create: {
          telegramId: telegramUserIdBigInt,
          firstName: ctx.from.first_name || 'Admin',
          lastName: ctx.from.last_name || '',
          username: ctx.from.username || 'admin',
          role: 'SUPER_ADMIN',
          cityId: olmaliqCity?.id,
        },
      });
    }

    // 2x2 Grid Reply Keyboard for City Selection (is_persistent: true, resize_keyboard: true)
    const cityKeyboard = new Keyboard()
      .text('🏙 Olmaliq').text('🏙 Chirchiq')
      .row()
      .text('🏙 Angren').text('🌐 Boshqa')
      .resized()
      .persistent();

    const startMessage = `**Assalomu alaykum!**\n\nQaysi shahardansiz? Tanlang:`;

    await ctx.reply(startMessage, {
      parse_mode: 'Markdown',
      reply_markup: cityKeyboard,
    });
    return;
  }

  // 2. SUPER ADMIN COMMANDS
  if (isSuperAdmin) {
    if (messageText === '/admin' || messageText === '/panel') {
      const activeCityId = session.cityId || defaultCityId;
      const listingsCount = await db.listing.count({ where: { cityId: activeCityId, status: 'ACTIVE' } });
      const unresolvedCount = await db.queryLog.count({ where: { cityId: activeCityId, isResolved: false } });
      const webAppUrl = process.env.WEBAPP_URL || 'https://olmaliq.online';

      const panelKeyboard = new InlineKeyboard()
        .webApp('⚡ Admin Panelni Ochish (TMA)', webAppUrl)
        .row()
        .text('📋 Oxirgi So\'rovlar', 'admin_view_unresolved')
        .text('➕ Yangi Usta Qo\'shish', 'admin_quick_add');

      const adminInfoText = `👑 **SUPER ADMIN BOSHQARUV PANELI**\n\n` +
        `🏙 Shahar: **${session.cityName || 'Olmaliq'}**\n` +
        `👷‍♂️ Faol Ustalar/Obyektlar: **${listingsCount} ta**\n` +
        `❓ Yechilmagan So'rovlar: **${unresolvedCount} ta**\n\n` +
        `Tezkor buyruqlar:\n` +
        `• \`/qosh <kasb> <ism> <telefon> <mo'ljal>\` — Tezkor usta qo'shish\n` +
        `• \`/ustalar\` — Barcha ustalar ro'yxati\n` +
        `• \`/savollar\` — Guruhlardagi yechilmagan savollar\n` +
        `• \`/deploy\` — Serverni yangilash`;

      await ctx.reply(adminInfoText, { parse_mode: 'Markdown', reply_markup: panelKeyboard });
      return;
    }

    if (messageText.startsWith('/qosh')) {
      const parts = messageText.replace('/qosh', '').trim().split(/\s+/);
      if (parts.length < 3) {
        session.step = 'CANDIDATE_NAME';
        session.candidateData = {};
        await ctx.reply(`➕ **Usta qo'shish (1/4)**\n\nUsta yoki do'kon nomini kiriting:\n\n_(yoki bir qatorda yozing: \`/qosh malyar Akmal +998901234567 Karzinka\`)_`, { parse_mode: 'Markdown' });
        return;
      }

      const [categoryName, masterName, phone, ...landmarkParts] = parts;
      const landmarkName = landmarkParts.join(' ') || 'Markaz';
      const activeCityId = session.cityId || defaultCityId;

      try {
        let cat = await db.category.findFirst({
          where: {
            OR: [
              { name: { equals: categoryName, mode: 'insensitive' } },
              { synonyms: { has: categoryName.toLowerCase() } },
            ],
          },
        });

        if (!cat) {
          cat = await db.category.create({
            data: { name: categoryName, synonyms: [categoryName.toLowerCase()] },
          });
        }

        let landmark = await db.landmark.findFirst({
          where: {
            cityId: activeCityId,
            OR: [
              { name: { equals: landmarkName, mode: 'insensitive' } },
              { synonyms: { has: landmarkName.toLowerCase() } },
            ],
          },
        });

        if (!landmark && landmarkName) {
          landmark = await db.landmark.create({
            data: { cityId: activeCityId, name: landmarkName, synonyms: [landmarkName.toLowerCase()] },
          });
        }

        const newListing = await db.listing.create({
          data: {
            cityId: activeCityId,
            name: masterName,
            phone: phone,
            categoryId: cat.id,
            objectType: 'USTA',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            primaryLandmarkId: landmark?.id,
          },
        });

        await ctx.reply(
          `✅ **Usta muvaffaqiyatli qo'shildi va darhol faollashdi!**\n\n` +
          `👤 Ism: **${masterName}**\n` +
          `🛠 Soha: **${cat.name}**\n` +
          `📞 Tel: **${phone}**\n` +
          `📍 Mo'ljal: **${landmarkName}**\n\n` +
          `Endi guruhda ushbu soha bo'yicha savol berilsa, bot darhol javob qaytaradi! 🚀`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('Failed to create listing directly:', err);
        await ctx.reply(`❌ Xatolik yuz berdi: ${err}`);
      }
      return;
    }

    if (messageText === '/savollar' || messageText === '📋 So\'rovlar') {
      const activeCityId = session.cityId || defaultCityId;
      const unresolvedQueries = await db.queryLog.findMany({
        where: { cityId: activeCityId, isResolved: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });

      if (unresolvedQueries.length === 0) {
        await ctx.reply(`🎉 Hozircha yechilmagan yangi so'rovlar yo'q! Barcha savollarga javob berilgan.`);
        return;
      }

      let text = `📋 **GURUHLARDAGI YECHILMAGAN OXIRGI SAVOLLAR:**\n\n`;
      unresolvedQueries.forEach((q, idx) => {
        text += `${idx + 1}. ❓ *"${q.rawMessage}"*\n`;
        text += `   🛠 Soha: \`${q.categoryName || 'Aniqlanmagan'}\` · 📍 Mo'ljal: \`${q.landmarkName || 'Yo\'q'}\`\n\n`;
      });
      text += `_Ushbu sohalarga usta qo'shish uchun: \`/qosh <soha> <ism> <tel>\` deb yozing._`;

      await ctx.reply(text, { parse_mode: 'Markdown' });
      return;
    }

    if (messageText === '/ustalar') {
      const activeCityId = session.cityId || defaultCityId;
      const listings = await db.listing.findMany({
        where: { cityId: activeCityId, status: 'ACTIVE' },
        include: { category: true, primaryLandmark: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      if (listings.length === 0) {
        await ctx.reply(`Bazada hozircha faol ustalar yo'q. Qo'shish uchun: \`/qosh\``);
        return;
      }

      let text = `👷‍♂️ **FAOL USTALAR VA XIZMATLAR:**\n\n`;
      listings.forEach((l, idx) => {
        text += `${idx + 1}. **${l.name}** (${l.category.name})\n`;
        text += `   📞 ${l.phone} · 📍 ${l.primaryLandmark?.name || 'Mavjud emas'}\n\n`;
      });

      await ctx.reply(text, { parse_mode: 'Markdown' });
      return;
    }
  }

  // 3. MAIN PERSISTENT MENU BUTTONS
  if (messageText === '🔍 Qidirish') {
    const cityName = session.cityName || 'Olmaliq';
    const searchMessage = `**Nima kerak? Yozing**\n\n` +
      `${cityName} bo'yicha ishonchli usta, xizmat yoki do'konlarni 3 soniyada topib beraman.\n\n` +
      `_Masalan: gazavik kerak · karzinka oldida dorixona_`;

    await ctx.reply(searchMessage, { parse_mode: 'Markdown' });
    return;
  }

  if (messageText === '🤝 Hamkor' || messageText === '🏢 O\'z shahringizga bot') {
    const franchiseText = `**"Kim bor?" botini o'z shahringizga ulash va shahar admini bo'lish**\n\n` +
      `Tariflar:\n` +
      `• 🌟 **Asoschi**: 149 000 so'm/oy (Birinchi 3 shahar)\n` +
      `• 🏙️ **Standart**: 299 000 so'm/oy\n` +
      `• 🏛️ **Katta shahar**: 499 000 so'm/oy (10 000+ auditoriya)\n\n` +
      `To'lov hozircha qo'lda: hisob beriladi, chek yuboriladi.\n\n` +
      `Arizani to'ldirish uchun pastdagi tugmani bosing:`;

    const appUrl = process.env.WEBAPP_URL || 'https://olmaliq.online';
    const franchiseKeyboard = new InlineKeyboard()
      .url('💳 Arizani to\'ldirish (Web App)', `${appUrl}`)
      .row()
      .text('📝 Chatda ariza berish', 'start_franchise_chat');

    await ctx.reply(franchiseText, { parse_mode: 'Markdown', reply_markup: franchiseKeyboard });
    return;
  }

  if (messageText === '➕ Ma\'lumot qo\'shish') {
    session.step = 'CANDIDATE_NAME';
    session.candidateData = {};

    await ctx.reply(
      `**Ma'lumot qo'shish**\n\n1/4. Usta yoki do'kon nomini kiriting:`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // 4. MULTI-STEP WIZARD: CANDIDATE / MASTER SUBMISSION
  if (session.step === 'CANDIDATE_NAME') {
    session.candidateData = { name: messageText };
    session.step = 'CANDIDATE_CAT';
    await ctx.reply(`2/4. Qaysi kasb yoki soha? (masalan: gazavik, santexnik, malyar, kafelchi):`);
    return;
  }

  if (session.step === 'CANDIDATE_CAT') {
    if (session.candidateData) session.candidateData.category = messageText;
    session.step = 'CANDIDATE_PHONE';
    await ctx.reply(`3/4. Usta telefon raqamini kiriting (masalan: +998901234567):`);
    return;
  }

  if (session.step === 'CANDIDATE_PHONE') {
    if (session.candidateData) session.candidateData.phone = messageText;
    session.step = 'CANDIDATE_LANDMARK';
    await ctx.reply(`4/4. Mo'ljal yoki manzilini ayting (masalan: Karzinka orqasi, 3-mavze):`);
    return;
  }

  if (session.step === 'CANDIDATE_LANDMARK') {
    if (session.candidateData) session.candidateData.landmark = messageText;

    const cand = session.candidateData;
    session.step = undefined;

    try {
      let candCategory = await db.category.findFirst({
        where: {
          OR: [
            { name: { equals: cand?.category || '', mode: 'insensitive' } },
            { synonyms: { has: (cand?.category || '').toLowerCase() } },
          ],
        },
      });

      if (!candCategory) {
        candCategory = await db.category.create({
          data: { name: cand?.category || 'Umumiy', synonyms: [(cand?.category || '').toLowerCase()] },
        });
      }

      let candLandmark = null;
      if (cand?.landmark) {
        candLandmark = await db.landmark.findFirst({
          where: {
            cityId: session.cityId || defaultCityId,
            OR: [
              { name: { equals: cand.landmark, mode: 'insensitive' } },
              { synonyms: { has: cand.landmark.toLowerCase() } },
            ],
          },
        });
        if (!candLandmark) {
          candLandmark = await db.landmark.create({
            data: {
              cityId: session.cityId || defaultCityId,
              name: cand.landmark,
              synonyms: [cand.landmark.toLowerCase()],
            },
          });
        }
      }

      if (isSuperAdmin) {
        // Super Admin kiritgan ma'lumot to'g'ridan-to'g'ri ACTIVE holatda bazaga tushadi!
        await db.listing.create({
          data: {
            cityId: session.cityId || defaultCityId,
            name: cand?.name || 'Usta',
            phone: cand?.phone || '',
            categoryId: candCategory.id,
            primaryLandmarkId: candLandmark?.id,
            objectType: 'USTA',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
          },
        });

        await ctx.reply(
          `✅ **Usta muvaffaqiyatli saqlandi va darhol faollashtirildi!**\n\n` +
          `👤 Nomi: **${cand?.name}**\n` +
          `🛠 Kasbi: **${candCategory.name}**\n` +
          `📞 Tel: **${cand?.phone}**\n` +
          `📍 Mo'ljal: **${cand?.landmark || 'Ko\'rsatilmagan'}**\n\n` +
          `Endi guruhda ushbu kasb so'ralsa, bot o'sha zahoti javob beradi! 🚀`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await db.candidate.create({
        data: {
          cityId: session.cityId || defaultCityId,
          name: cand?.name || 'Noma\'lum',
          categoryId: candCategory.id,
          phone: cand?.phone || '',
          submittedBy: telegramUserIdBigInt.toString(),
        },
      });
      await ctx.reply(`Rahmat, tekshirib qo'shamiz! 🙌\n\nMa'lumotlar adminga tasdiqlash uchun yuborildi.`);
    } catch (e) {
      console.error('Failed to create listing/candidate:', e);
      await ctx.reply(`Xatolik yuz berdi: ${e}`);
    }
    return;
  }

  // 4. MULTI-STEP WIZARD: FRANCHISE CHAT APPLICATION
  if (session.step === 'FRANCHISE_NAME') {
    session.franchiseData = { name: messageText };
    session.step = 'FRANCHISE_PHONE';
    await ctx.reply(`2/4. Telefon raqamingizni kiriting:`);
    return;
  }

  if (session.step === 'FRANCHISE_PHONE') {
    if (session.franchiseData) session.franchiseData.phone = messageText;
    session.step = 'FRANCHISE_CITY';
    await ctx.reply(`3/4. Qaysi shahar uchun ariza bermoqchisiz?`);
    return;
  }

  if (session.step === 'FRANCHISE_CITY') {
    if (session.franchiseData) session.franchiseData.city = messageText;
    session.step = 'FRANCHISE_LINK';
    await ctx.reply(`4/4. Telegram guruh havolasini yuboring (masalan: https://t.me/olmaliq_chat):`);
    return;
  }

  if (session.step === 'FRANCHISE_LINK') {
    if (session.franchiseData) session.franchiseData.link = messageText;
    const fData = session.franchiseData;
    session.step = undefined;

    try {
      await db.application.create({
        data: {
          fullName: fData?.name || 'Arizachi',
          phone: fData?.phone || '',
          cityName: fData?.city || 'Yangi Shahar',
          groupLink: fData?.link || '',
          telegramUserId: telegramUserIdBigInt,
          status: 'PENDING',
        },
      });
    } catch (e) {
      console.error('Failed to create application:', e);
    }

    await ctx.reply(`✅ Arizangiz qabul qilindi!\n\nSuper-Admin ko'rib chiqqach, tez orada siz bilan bog'lanadi. Rahmat!`);
    return;
  }

  // 5. STANDARD FREE-TEXT SEARCH FLOW
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const queryCountToday = await db.queryLog.count({
    where: {
      telegramUserId: telegramUserIdBigInt,
      createdAt: { gte: todayStart },
    },
  });

  if (queryCountToday >= 20) {
    await ctx.reply("🚫 Bugungi 20 ta savol limitingiz tugadi. Ertaga qayta urinib ko'ring.");
    return;
  }

  const activeCityId = session.cityId || defaultCityId;

  // Classify query intent
  const classification = await classifyQuery(messageText, activeCityId, telegramUserIdBigInt);

  // Clarification if landmark missing
  if (!classification.landmark && classification.category) {
    const keyboard = new InlineKeyboard()
      .text('📍 Karzinka', `area_korzinka_${classification.category}`)
      .text('📍 3-mavze', `area_3mavze_${classification.category}`)
      .row()
      .text('📍 Bozor', `area_bozor_${classification.category}`)
      .text('🌐 Farqi yo\'q', `area_any_${classification.category}`);

    await ctx.reply('Qaysi mo\'ljal yaqinida kerak edi?', { reply_markup: keyboard });
    return;
  }

  // Execute search
  const searchResult = await searchListings({
    cityId: activeCityId,
    categoryName: classification.category,
    landmarkName: classification.landmark,
    limit: 1,
  });

  if (!searchResult) {
    await db.queryLog.create({
      data: {
        cityId: activeCityId,
        telegramUserId: telegramUserIdBigInt,
        rawMessage: messageText,
        intent: classification.intent,
        categoryName: classification.category,
        landmarkName: classification.landmark,
        isResolved: false,
      },
    });

    await ctx.reply("Bu bo'yicha hozircha ma'lumot yo'q. Tez orada qo'shamiz 🙌");
    return;
  }

  // Build result response with Copy Phone and Map button
  const resultKeyboard = new InlineKeyboard();
  if (searchResult.listing.primaryLandmark?.latitude && searchResult.listing.primaryLandmark?.longitude) {
    const mapUrl = `https://yandex.uz/maps/?pt=${searchResult.listing.primaryLandmark.longitude},${searchResult.listing.primaryLandmark.latitude}&z=16&l=map`;
    resultKeyboard.url('📍 Xarita', mapUrl);
  }
  resultKeyboard
    .text(`📋 Nusxalash (${searchResult.listing.phone})`, `copy_phone_${searchResult.listing.phone}`)
    .row()
    .text('⭐ Baholash', `rate_${searchResult.listingId}`)
    .text('⚠️ Shikoyat', `report_${searchResult.listingId}`);

  await ctx.reply(searchResult.formattedText, { reply_markup: resultKeyboard });
}

// Callback Query Handler for Direct Chat Sessions
export async function handleDirectCallbacks(ctx: Context, defaultCityId: string) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;

  const userId = ctx.from.id;
  let session = userSessions[userId];
  if (!session) {
    session = { cityId: defaultCityId };
    userSessions[userId] = session;
  }

  // 1. Franchise chat start callback
  if (data === 'start_franchise_chat') {
    session.step = 'FRANCHISE_NAME';
    session.franchiseData = {};
    await ctx.answerCallbackQuery();
    await ctx.reply('1/4. Ism va familiyangizni kiriting:');
    return;
  }

  // 2. Admin Quick Add callback
  if (data === 'admin_quick_add') {
    session.step = 'CANDIDATE_NAME';
    session.candidateData = {};
    await ctx.answerCallbackQuery();
    await ctx.reply('➕ **Yangi Usta/Obyekt Qo\'shish (1/4)**\n\nUsta yoki do\'kon nomini kiriting:', { parse_mode: 'Markdown' });
    return;
  }

  // 3. Admin View Unresolved callback
  if (data === 'admin_view_unresolved') {
    await ctx.answerCallbackQuery();
    const activeCityId = session.cityId || defaultCityId;
    const unresolvedQueries = await db.queryLog.findMany({
      where: { cityId: activeCityId, isResolved: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    if (unresolvedQueries.length === 0) {
      await ctx.reply(`🎉 Yechilmagan yangi so'rovlar yo'q!`);
      return;
    }

    let text = `📋 **GURUHLARDAGI YECHILMAGAN OXIRGI SAVOLLAR:**\n\n`;
    unresolvedQueries.forEach((q, idx) => {
      text += `${idx + 1}. ❓ *"${q.rawMessage}"*\n`;
      text += `   🛠 Soha: \`${q.categoryName || 'Aniqlanmagan'}\` · 📍 Mo'ljal: \`${q.landmarkName || 'Yo\'q'}\`\n\n`;
    });
    text += `_Usta qo'shish uchun: \`/qosh <soha> <ism> <tel>\` deb yozing._`;
    await ctx.reply(text, { parse_mode: 'Markdown' });
    return;
  }

  // 4. Copy phone callback
  if (data.startsWith('copy_phone_')) {
    const phone = data.replace('copy_phone_', '');
    await ctx.answerCallbackQuery({ text: `📋 Telefon raqami: ${phone}`, show_alert: true });
    return;
  }
}

// Helper to send persistent 2x2 reply keyboard matching exact user specification
async function sendMainMenu(ctx: Context, cityName: string, isAdmin: boolean) {
  const webAppUrl = process.env.WEBAPP_URL || 'https://olmaliq.online';

  // 2x2 Grid Reply Keyboard
  const replyMenu = new Keyboard()
    .text('🔍 Qidirish').text('🤝 Hamkor')
    .row();

  if (isAdmin) {
    replyMenu.webApp('🌐 Admin Paneli', webAppUrl).text('➕ Ma\'lumot qo\'shish').row();
  }

  replyMenu.resized().persistent();

  const messageText = `**${cityName}** tanlandi\n\n` +
    `Nima kerak? Yozing — shu shahar ichidan topib beraman.\n\n` +
    `_Masalan: gazavik kerak · karzinka oldida dorixona_`;

  if (isAdmin) {
    const inlineAdminMenu = new InlineKeyboard().webApp('⚡ Admin Panelni Ochish (Mini App)', webAppUrl);
    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: replyMenu,
    });
    await ctx.reply(`👨‍💼 **Siz Shahar Adminisiz!**\nBoshqaruv paneliga kirish uchun pastdagi tugmani bosing:`, {
      parse_mode: 'Markdown',
      reply_markup: inlineAdminMenu,
    });
  } else {
    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: replyMenu,
    });
  }
}
