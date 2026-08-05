import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { classifyQuery } from '../filter/aiClassifier';
import { searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';

// User session state map for multi-step wizards in private chat
const userSessions: Record<number, {
  step?: 'CITY_SELECT' | 'CANDIDATE_NAME' | 'CANDIDATE_CAT' | 'CANDIDATE_PHONE' | 'CANDIDATE_LANDMARK' | 'FRANCHISE_NAME' | 'FRANCHISE_PHONE' | 'FRANCHISE_CITY' | 'FRANCHISE_LINK';
  cityId?: string;
  cityName?: string;
  language?: 'lotin' | 'kirill' | 'rus' | 'auto';
  candidateData?: { name?: string; category?: string; phone?: string; landmark?: string };
  franchiseData?: { name?: string; phone?: string; city?: string; link?: string };
}> = {};

export async function handleDirectMessage(ctx: Context, defaultCityId: string) {
  const messageText = ctx.message?.text?.trim();
  if (!messageText || !ctx.from) return;

  const userId = ctx.from.id;
  const telegramUserIdBigInt = BigInt(userId);
  const isSuperAdmin = telegramUserIdBigInt === BigInt(6355516451);

  // Retrieve user session
  let session = userSessions[userId];
  if (!session) {
    session = { cityId: defaultCityId, language: 'lotin' };
    userSessions[userId] = session;
  }

  // 1. COMMAND: /start
  if (messageText === '/start') {
    session.step = 'CITY_SELECT';

    // 2x2 Grid City Keyboard
    const cityKeyboard = new InlineKeyboard()
      .text('🏙️ Olmaliq', 'select_city_olmaliq')
      .text('🏙️ Chirchiq', 'select_city_chirchiq')
      .row()
      .text('🏙️ Angren', 'select_city_angren')
      .text('🌐 Boshqa shahar', 'select_city_other');

    await ctx.reply(
      `Salom! Men **"Kim bor?"** — shahar bo'yicha yordamchiman. 🚀\n\nQaysi shahardansiz?`,
      { parse_mode: 'Markdown', reply_markup: cityKeyboard }
    );
    return;
  }

  // 2. MAIN MENU BUTTONS HANDLER
  if (messageText === '🌐 Tilni tanlash') {
    const langKeyboard = new InlineKeyboard()
      .text('🇺🇿 O\'zbekcha (Lotin)', 'set_lang_lotin')
      .text('🇺🇿 Ўзбекча (Кирилл)', 'set_lang_kirill')
      .row()
      .text('🇷🇺 Русский', 'set_lang_rus')
      .text('🌐 Avtomatik', 'set_lang_auto');

    await ctx.reply('Muloqot tilini tanlang / Choose language:', { reply_markup: langKeyboard });
    return;
  }

  if (messageText === '🔍 Usta topish' || messageText === '🔍 Usta yoki do\'kon topish') {
    // 2x2 Grid Category Keyboard
    const quickCatKeyboard = new InlineKeyboard()
      .text('⚡ Elektrik', 'quick_search_elektrik')
      .text('🚰 Santexnik', 'quick_search_santexnik')
      .row()
      .text('🔥 Gazavik', 'quick_search_gazavik')
      .text('🧱 Kafelchi', 'quick_search_kafelchi')
      .row()
      .text('🪑 Mebelchi', 'quick_search_mebelchi')
      .text('🎨 Malyar', 'quick_search_malyar');

    await ctx.reply(
      `Qaysi kasb yoki usta kerak? Nomi yoki mo'ljal bo'yicha yozing (masalan: *"karzinka oldida gazavik"*) yoki pastdagi 2x2 tugmalardan tanlang:`,
      { parse_mode: 'Markdown', reply_markup: quickCatKeyboard }
    );
    return;
  }

  if (messageText === '➕ Ma\'lumot qo\'shish') {
    session.step = 'CANDIDATE_NAME';
    session.candidateData = {};

    await ctx.reply(
      `Siz bilgan ishonchli usta yoki do'kon haqida ma'lumot berishingiz mumkin! 🙌\n\n1/4. Usta yoki do'kon nomini kiriting:`
    );
    return;
  }

  if (messageText === '🏢 O\'z shahringizga bot') {
    const franchiseText = `🏢 **"Kim bor?" botini o'z shahringizga ulash va shahar admini bo'lish**\n\n` +
      `Tariflar:\n` +
      `• 🌟 **Asoschi**: 149 000 so'm/oy (Birinchi 3 shahar uchun)\n` +
      `• 🏙️ **Standart**: 299 000 so'm/oy\n` +
      `• 🏛️ **Katta shahar**: 499 000 so'm/oy (10 000+ auditoriya)\n\n` +
      `To'lov hozircha qo'lda qabul qilinadi: hisob taqdim etiladi va chek yuboriladi.\n\n` +
      `Arizani to'ldirish uchun pastdagi tugmani bosing:`;

    const appUrl = process.env.WEBAPP_URL || 'https://7d0905ff78ad33.lhr.life';
    const franchiseKeyboard = new InlineKeyboard()
      .url('💳 Arizani to\'ldirish (Web App)', `${appUrl}`)
      .row()
      .text('📝 Chatda ariza berish', 'start_franchise_chat');

    await ctx.reply(franchiseText, { parse_mode: 'Markdown', reply_markup: franchiseKeyboard });
    return;
  }

  // 3. MULTI-STEP WIZARD: CANDIDATE SUBMISSION
  if (session.step === 'CANDIDATE_NAME') {
    session.candidateData = { name: messageText };
    session.step = 'CANDIDATE_CAT';
    await ctx.reply(`2/4. Qaysi kasb yoki soha? (masalan: gazavik, santexnik, kafelchi):`);
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

      await db.candidate.create({
        data: {
          cityId: session.cityId || defaultCityId,
          name: cand?.name || 'Noma\'lum',
          categoryId: candCategory.id,
          phone: cand?.phone || '',
          submittedBy: telegramUserIdBigInt.toString(),
        },
      });
    } catch (e) {
      console.error('Failed to create candidate:', e);
    }

    await ctx.reply(`Rahmat, tekshirib qo'shamiz! 🙌\n\nMa'lumotlar adminga tasdiqlash uchun yuborildi.`);
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
          applicantName: fData?.name || 'Arizachi',
          phone: fData?.phone || '',
          cityName: fData?.city || 'Yangi Shahar',
          groupLink: fData?.link || '',
          status: 'PENDING',
        },
      });
    } catch (e) {
      console.error('Failed to create application:', e);
    }

    await ctx.reply(`✅ Arizangiz qabul qilindi!\n\nSuper-Admin ko'rib chiqqach, tez orada siz bilan bog'lanadi. Rahmat!`);
    return;
  }

  // 5. STANDARD SEARCH FLOW
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

  // Build result response with Copy Phone button
  const resultKeyboard = new InlineKeyboard()
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
    session = { cityId: defaultCityId, language: 'lotin' };
    userSessions[userId] = session;
  }

  // 1. Language callbacks
  if (data.startsWith('set_lang_')) {
    const lang = data.replace('set_lang_', '') as any;
    session.language = lang;
    await ctx.answerCallbackQuery({ text: 'Til sozlamasi o\'zgartirildi! ✅' });
    await sendMainMenu(ctx, session.cityName || 'Olmaliq', ctx.from.id === 6355516451);
    return;
  }

  // 2. City selection callbacks
  if (data === 'select_city_olmaliq') {
    let city = await db.city.findFirst({ where: { slug: 'olmaliq' } });
    session.cityId = city ? city.id : defaultCityId;
    session.cityName = 'Olmaliq';

    await ctx.answerCallbackQuery({ text: 'Olmaliq shahri tanlandi! 🏙️' });
    await sendMainMenu(ctx, 'Olmaliq', ctx.from.id === 6355516451);
    return;
  }

  if (data === 'select_city_chirchiq') {
    let city = await db.city.findFirst({ where: { slug: 'chirchiq' } });
    if (!city) {
      city = await db.city.create({ data: { name: 'Chirchiq', slug: 'chirchiq', isActive: true } });
    }
    session.cityId = city.id;
    session.cityName = 'Chirchiq';

    await ctx.answerCallbackQuery({ text: 'Chirchiq shahri tanlandi! 🏙️' });
    await sendMainMenu(ctx, 'Chirchiq', ctx.from.id === 6355516451);
    return;
  }

  if (data === 'select_city_angren') {
    let city = await db.city.findFirst({ where: { slug: 'angren' } });
    if (!city) {
      city = await db.city.create({ data: { name: 'Angren', slug: 'angren', isActive: true } });
    }
    session.cityId = city.id;
    session.cityName = 'Angren';

    await ctx.answerCallbackQuery({ text: 'Angren shahri tanlandi! 🏙️' });
    await sendMainMenu(ctx, 'Angren', ctx.from.id === 6355516451);
    return;
  }

  if (data === 'select_city_other') {
    await ctx.answerCallbackQuery();
    await ctx.reply('Bu shaharda bot hali yo\'q.');
    return;
  }

  // 3. Franchise chat start callback
  if (data === 'start_franchise_chat') {
    session.step = 'FRANCHISE_NAME';
    session.franchiseData = {};
    await ctx.answerCallbackQuery();
    await ctx.reply('1/4. Ism va familiyangizni kiriting:');
    return;
  }

  // 4. Quick search callbacks
  if (data.startsWith('quick_search_')) {
    const category = data.replace('quick_search_', '');
    await ctx.answerCallbackQuery({ text: `${category} qidirilmoqda...` });

    const searchResult = await searchListings({
      cityId: session.cityId || defaultCityId,
      categoryName: category,
      limit: 1,
    });

    if (!searchResult) {
      await ctx.reply(`"Kim bor?" — ${category} bo'yicha hozircha ma'lumot topilmadi.`);
      return;
    }

    const resultKeyboard = new InlineKeyboard()
      .text(`📋 Nusxalash (${searchResult.listing.phone})`, `copy_phone_${searchResult.listing.phone}`)
      .row()
      .text('⭐ Baholash', `rate_${searchResult.listingId}`)
      .text('⚠️ Shikoyat', `report_${searchResult.listingId}`);

    await ctx.reply(searchResult.formattedText, { reply_markup: resultKeyboard });
    return;
  }

  // 5. Copy phone callback
  if (data.startsWith('copy_phone_')) {
    const phone = data.replace('copy_phone_', '');
    await ctx.answerCallbackQuery({ text: `📋 Telefon raqami: ${phone}`, show_alert: true });
    return;
  }
}

// Helper to send main menu reply keyboard with clean 2x2 grid layout
async function sendMainMenu(ctx: Context, cityName: string, isAdmin: boolean) {
  // 2x2 Grid Reply Keyboard
  const replyMenu = new Keyboard()
    .text('🔍 Usta topish').text('➕ Ma\'lumot qo\'shish')
    .row()
    .text('🏢 O\'z shahringizga bot').text('🌐 Tilni tanlash')
    .resized();

  let text = `Siz **${cityName}** shahrini tanladingiz. ✅\n\n` +
    `Quyidagi 2x2 tugmalardan birini bosing yoki shunchaki savolingizni yozing:\n` +
    `• *"karzinka oldida gazavik bormi?"*\n` +
    `• *"santexnik kerak 3-mavze"*`;

  const inlineButtons = new InlineKeyboard();
  if (isAdmin) {
    const appUrl = process.env.WEBAPP_URL || 'https://7d0905ff78ad33.lhr.life';
    inlineButtons.url('🌐 Admin Paneli (Boshqaruv)', `${appUrl}`);
  }

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: isAdmin ? inlineButtons : replyMenu,
  });

  if (isAdmin) {
    await ctx.reply('Menyu tugmalaridan ham foydalanishingiz mumkin:', { reply_markup: replyMenu });
  }
}
