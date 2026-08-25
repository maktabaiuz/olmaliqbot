import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { classifyQuery } from '../filter/aiClassifier';
import { searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';
import { setRankedList, getRankedList } from '../cache/rankedListCache';

// User session state map for multi-step wizards in private chat
const userSessions: Record<number, {
  step?: 'CANDIDATE_NAME' | 'CANDIDATE_CAT' | 'CANDIDATE_PHONE' | 'CANDIDATE_LANDMARK';
  cityId?: string;
  cityName?: string;
  candidateData?: { name?: string; category?: string; phone?: string; landmark?: string };
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
      `<b>Assalomu alaykum!</b>\n\nMen "Kim bor?" — Olmaliq shahri bo'yicha yordamchi botman. 🚀\n\nGuruhda savollaringizni bemalol berishingiz mumkin, yoki pastdagi tugma orqali admin panelini oching:`,
      { parse_mode: 'HTML', reply_markup: openAppKeyboard }
    );

    await sendMainMenu(ctx, isSuperAdmin);
    return;
  }

  // 2. MAIN PERSISTENT MENU BUTTONS
  if (messageText === '🔍 Qidirish') {
    const searchMessage = `<b>Nima kerak? Yozing</b>\n\n` +
      `Olmaliq bo'yicha ishonchli usta, xizmat yoki do'konlarni 3 soniyada topib beraman.\n\n` +
      `<i>Masalan: gazavik kerak · karzinka oldida dorixona</i>`;

    await ctx.reply(searchMessage, { parse_mode: 'HTML' });
    return;
  }

  if (messageText === '➕ Ma\'lumot qo\'shish') {
    session.step = 'CANDIDATE_NAME';
    session.candidateData = {};

    await ctx.reply(
      `<b>Ma'lumot qo'shish</b>\n\n1/4. Usta yoki do'kon nomini kiriting:`,
      { parse_mode: 'HTML' }
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

  // 4. STANDARD FREE-TEXT SEARCH FLOW
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
  });

  if (!searchResult) {
    db.queryLog.create({
      data: {
        cityId: activeCityId,
        telegramUserId: telegramUserIdBigInt,
        rawMessage: messageText,
        intent: classification.intent,
        categoryName: classification.category,
        landmarkName: classification.landmark,
        isResolved: false,
      },
    }).catch((err) => console.error('Failed to log unresolved QueryLog:', err));

    await ctx.reply("Bu bo'yicha hozircha ma'lumot yo'q. Tez orada qo'shamiz 🙌");
    return;
  }

  // Build result response with Copy Phone button
  const resultKeyboard = new InlineKeyboard()
    .text('📋 Raqamni nusxalash', `copy_phone_${searchResult.listing.phone}`)
    .row();

  if (searchResult.hasMore) {
    await setRankedList(searchResult.listingId, searchResult.rankedListText);
    resultKeyboard.text(`Yana ${searchResult.totalMatches - 1} tasini ko'rish`, `more_${searchResult.listingId}`).row();
  }

  resultKeyboard
    .text('⭐ Baholash', `rate_${searchResult.listingId}`)
    .text('⚠️ Shikoyat', `report_${searchResult.listingId}`);

  await ctx.reply(searchResult.formattedText, { parse_mode: 'HTML', reply_markup: resultKeyboard });
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

  // 1. Copy phone callback
  if (data.startsWith('copy_phone_')) {
    const phone = data.replace('copy_phone_', '');
    await ctx.answerCallbackQuery({ text: `📋 Telefon raqami: ${phone}`, show_alert: true });
    return;
  }

  // 2. "Yana N tasini ko'rish" — 1-7 ranked ro'yxatni ochish
  if (data.startsWith('more_')) {
    const listingId = data.replace('more_', '');
    const rankedText = await getRankedList(listingId);

    if (!rankedText) {
      await ctx.answerCallbackQuery({ text: "Vaqti tugadi, savolni qayta yozing 🙏", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText(rankedText, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('⭐ Baholash', `rate_${listingId}`)
          .text('⚠️ Shikoyat', `report_${listingId}`),
      });
    } catch (err) {
      console.error('Failed to expand ranked list:', err);
    }
    return;
  }
}

// Helper to send persistent 2x2 reply keyboard matching exact user specification
async function sendMainMenu(ctx: Context, isAdmin: boolean) {
  // Reply Keyboard (is_persistent: true, resize_keyboard: true)
  const replyMenu = new Keyboard()
    .text('🔍 Qidirish').row();

  if (isAdmin) {
    replyMenu.text('➕ Ma\'lumot qo\'shish').row();
  }

  replyMenu.resized().persistent();

  const messageText = `Nima kerak? Yozing — Olmaliq ichidan topib beraman.\n\n` +
    `<i>Masalan: gazavik kerak · karzinka oldida dorixona</i>`;

  await ctx.reply(messageText, {
    parse_mode: 'HTML',
    reply_markup: replyMenu,
  });
}
