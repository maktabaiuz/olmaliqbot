import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { classifyQuery } from '../filter/aiClassifier';
import { searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';

// User session state map for multi-step wizards in private chat
const userSessions: Record<number, {
  step?: 'CANDIDATE_NAME' | 'CANDIDATE_CAT' | 'CANDIDATE_PHONE' | 'CANDIDATE_LANDMARK' | 'FRANCHISE_NAME' | 'FRANCHISE_PHONE' | 'FRANCHISE_CITY' | 'FRANCHISE_LINK';
  cityId?: string;
  cityName?: string;
  candidateData?: { name?: string; category?: string; phone?: string; landmark?: string };
  franchiseData?: { name?: string; phone?: string; city?: string; link?: string };
}> = {};

export async function handleDirectMessage(ctx: Context, defaultCityId: string) {
  const messageText = ctx.message?.text?.trim();
  if (!messageText || !ctx.from) return;

  const userId = ctx.from.id;
  const telegramUserIdBigInt = BigInt(userId);
  const superAdminIds = [BigInt(6355516451), BigInt(8323651390)];
  const isSuperAdmin = superAdminIds.some((id) => id === telegramUserIdBigInt);

  // Retrieve user session
  let session = userSessions[userId];
  if (!session) {
    session = { cityId: defaultCityId };
    userSessions[userId] = session;
  }

  // 1. COMMAND: /start
  if (messageText === '/start') {
    session.step = undefined;

    const webappUrl = process.env.WEBAPP_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}`;
    const openAppKeyboard = new InlineKeyboard().webApp('🌐 Web ilovani ochish', webappUrl);

    await ctx.reply(
      `**Assalomu alaykum!**\n\nMen "Kim bor?" — Olmaliq shahri bo'yicha yordamchi botman. 🚀\n\nGuruhda savollaringizni bemalol berishingiz mumkin, yoki pastdagi tugma orqali admin panelini oching:`,
      { parse_mode: 'Markdown', reply_markup: openAppKeyboard }
    );

    await sendMainMenu(ctx, isSuperAdmin);
    return;
  }

  // 2. MAIN PERSISTENT MENU BUTTONS
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

    const appUrl = process.env.WEBAPP_URL || 'https://7d0905ff78ad33.lhr.life';
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
          fullName: fData?.name || 'Arizachi',
          phone: fData?.phone || '',
          cityName: fData?.city || 'Yangi Shahar',
          groupLink: fData?.link || '',
          telegramUserId: BigInt(ctx.from?.id || 0),
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

  // Execute search directly without blocking on landmark
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

  // 2. Copy phone callback
  if (data.startsWith('copy_phone_')) {
    const phone = data.replace('copy_phone_', '');
    await ctx.answerCallbackQuery({ text: `📋 Telefon raqami: ${phone}`, show_alert: true });
    return;
  }
}

// Helper to send persistent 2x2 reply keyboard matching exact user specification
async function sendMainMenu(ctx: Context, isAdmin: boolean) {
  // 2x2 Grid Reply Keyboard (is_persistent: true, resize_keyboard: true)
  const replyMenu = new Keyboard()
    .text('🔍 Qidirish').text('🤝 Hamkor')
    .row();

  if (isAdmin) {
    replyMenu.text('➕ Ma\'lumot qo\'shish').row();
  }

  replyMenu.resized().persistent();

  const messageText = `Nima kerak? Yozing — Olmaliq ichidan topib beraman.\n\n` +
    `_Masalan: gazavik kerak · karzinka oldida dorixona_`;

  await ctx.reply(messageText, {
    parse_mode: 'Markdown',
    reply_markup: replyMenu,
  });
}
