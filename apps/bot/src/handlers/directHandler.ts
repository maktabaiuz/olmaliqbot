import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { classifyQuery } from '../filter/aiClassifier';
import { searchListings, isSelfOffer, matchCategoryFromText, normalizeText } from '@kimbor/core';
import { IntentType } from '@kimbor/types';
import { db } from '@kimbor/db';
import { setRankedList, getRankedList } from '../cache/rankedListCache';

type SessionStep =
  | 'CANDIDATE_NAME'
  | 'CANDIDATE_CAT'
  | 'CANDIDATE_PHONE'
  | 'CANDIDATE_LANDMARK'
  | 'OFFER_CONFIRM'
  | 'CLARIFY_LANDMARK';

const userSessions: Record<number, {
  step?: SessionStep;
  cityId?: string;
  cityName?: string;
  candidateData?: { name?: string; category?: string; phone?: string; landmark?: string };
  offerCategory?: string;
  pendingSearch?: { category: string | null; rawMessage: string };
}> = {};

export async function handleDirectMessage(ctx: Context, defaultCityId: string) {
  const messageText = ctx.message?.text?.trim();
  if (!messageText || !ctx.from) return;

  const userId = ctx.from.id;
  const telegramUserIdBigInt = BigInt(userId);
  const username = (ctx.from.username || '').toLowerCase().replace('@', '');
  const superAdminIds = [BigInt(358795989), BigInt(6355516451), BigInt(8323651390), BigInt(8603273053)];
  const superAdminUsernames = ['superman_uzb', 'ai_loyihachi', 'bobur_owner', 'bobur_admin'];
  const isSuperAdmin = superAdminIds.some((id) => id === telegramUserIdBigInt) || superAdminUsernames.includes(username);

  let session = userSessions[userId];
  if (!session) {
    session = { cityId: defaultCityId };
    userSessions[userId] = session;
  }

  if (messageText === '/start') {
    session.step = undefined;
    session.offerCategory = undefined;
    session.pendingSearch = undefined;
    session.candidateData = undefined;

    const webappUrl = `${process.env.WEBAPP_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}`}?v=${Date.now()}`;
    // Telegram Bot API: style = primary (ko'k) | success (yashil) | danger (qizil)
    const startKeyboard = {
      inline_keyboard: [
        [{ text: "🌐  Webga o'tish", web_app: { url: webappUrl }, style: "primary" }],
        [{ text: "➕  O'zimni qo'shish", callback_data: "start_add_me", style: "success" }],
        [{ text: "💬  Chatda so'rash", callback_data: "start_chat", style: "primary" }],
      ],
    };

    await ctx.reply(
      `<b>Assalomu alaykum.</b>\nMen Olmaliq botman.\nSun'iy intellekt asosida ishlayman.`,
      { parse_mode: 'HTML', reply_markup: startKeyboard as any }
    );
    return;
  }

  if (messageText === '🔍 Qidirish') {
    session.step = undefined;
    session.pendingSearch = undefined;
    await ctx.reply(
      `<b>Nima kerak? Yozing</b>\n\nMasalan: gazavik kerak · karzinka oldida dorixona`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (messageText === '➕ Ma\'lumot qo\'shish') {
    session.step = 'CANDIDATE_NAME';
    session.candidateData = {};
    await ctx.reply(`<b>Ma'lumot qo'shish</b>\n\n1/4. Usta yoki do'kon nomini kiriting:`, { parse_mode: 'HTML' });
    return;
  }

  if (session.step === 'CLARIFY_LANDMARK' && session.pendingSearch) {
    const pending = session.pendingSearch;
    session.step = undefined;
    session.pendingSearch = undefined;
    const wholeCity = /^(shahar|hammasi|farqi yo'?q|yo'?q|olmaliq)$/i.test(messageText);
    await runPrivateSearch(ctx, {
      cityId: session.cityId || defaultCityId,
      telegramUserId: telegramUserIdBigInt,
      categoryName: pending.category,
      landmarkName: wholeCity ? null : messageText,
      rawMessage: pending.rawMessage,
    });
    return;
  }

  if (session.step === 'CANDIDATE_NAME') {
    session.candidateData = { ...(session.candidateData || {}), name: messageText };
    if (session.candidateData.category) {
      session.step = 'CANDIDATE_PHONE';
      await ctx.reply(`Telefon raqamingiz? (masalan: +998901234567)`);
    } else {
      session.step = 'CANDIDATE_CAT';
      await ctx.reply(`Qaysi kasb yoki soha? (masalan: gazavik, labo, santexnik):`);
    }
    return;
  }

  if (session.step === 'CANDIDATE_CAT') {
    if (session.candidateData) session.candidateData.category = messageText;
    session.step = 'CANDIDATE_PHONE';
    await ctx.reply(`Telefon raqamingiz? (masalan: +998901234567)`);
    return;
  }

  if (session.step === 'CANDIDATE_PHONE') {
    if (session.candidateData) session.candidateData.phone = messageText;
    session.step = 'CANDIDATE_LANDMARK';
    await ctx.reply(`Qaysi hudud? (masalan: Karzinka orqasi, 3-mavze):`);
    return;
  }

  if (session.step === 'CANDIDATE_LANDMARK') {
    if (session.candidateData) session.candidateData.landmark = messageText;
    const cand = session.candidateData;
    session.step = undefined;
    session.offerCategory = undefined;

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

      let landmarkId: string | undefined;
      if (cand?.landmark) {
        const lm = await db.landmark.findFirst({
          where: {
            cityId: session.cityId || defaultCityId,
            OR: [
              { name: { equals: cand.landmark, mode: 'insensitive' } },
              { synonyms: { has: cand.landmark.toLowerCase() } },
            ],
          },
        });
        landmarkId = lm?.id;
      }

      await db.candidate.create({
        data: {
          cityId: session.cityId || defaultCityId,
          name: cand?.name || 'Noma\'lum',
          categoryId: candCategory.id,
          phone: cand?.phone || '',
          primaryLandmarkId: landmarkId,
          submittedBy: telegramUserIdBigInt.toString(),
          source: 'lichka',
        },
      });
    } catch (e) {
      console.error('Failed to create candidate:', e);
    }

    await ctx.reply(`Rahmat, tekshirib qo'shamiz. Adminga yuborildi.`);
    return;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const queryCountToday = await db.queryLog.count({
    where: {
      telegramUserId: telegramUserIdBigInt,
      createdAt: { gte: todayStart },
    },
  });

  if (queryCountToday >= 20) {
    await ctx.reply("Bugungi 20 ta savol limitingiz tugadi. Ertaga yozing.");
    return;
  }

  const activeCityId = session.cityId || defaultCityId;
  const classification = await classifyQuery(messageText, activeCityId, telegramUserIdBigInt);
  const dictMatch = matchCategoryFromText(normalizeText(messageText));
  const categoryGuess = classification.category || dictMatch?.canonicalName || null;

  if (classification.intent !== 'EMERGENCY' && isSelfOffer(messageText)) {
    session.step = 'OFFER_CONFIRM';
    session.offerCategory = categoryGuess || undefined;
    const catLabel = categoryGuess || 'xizmat';
    const keyboard = new InlineKeyboard()
      .text('Ha, qo\'shing', 'add_me_yes')
      .text('Yo\'q, qidiruv', 'add_me_no');
    await ctx.reply(
      `Bu qidiruv emas — o'zingizni taklif qilyapsiz.\n<b>${escapeHtml(catLabel)}</b> sifatida Olmaliq bazasiga qo'shamizmi?`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
    return;
  }

  const isSeeking =
    classification.intent === 'SERVICE' ||
    classification.intent === 'CONTACT' ||
    classification.intent === 'HOURS' ||
    classification.intent === 'LOCATION' ||
    classification.intent === 'PRICE';

  if (isSeeking && categoryGuess && !classification.landmark) {
    session.step = 'CLARIFY_LANDMARK';
    session.pendingSearch = { category: categoryGuess, rawMessage: messageText };
    await ctx.reply(
      `Qaysi hudud?\nMasalan: 3-mavze, Karzinka.\nButun shahar bo'lsa — <b>shahar</b> deb yozing.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  await runPrivateSearch(ctx, {
    cityId: activeCityId,
    telegramUserId: telegramUserIdBigInt,
    categoryName: isSeeking ? categoryGuess : null,
    landmarkName: isSeeking ? classification.landmark : null,
    rawMessage: messageText,
    intent: classification.intent,
  });
}

async function runPrivateSearch(
  ctx: Context,
  opts: {
    cityId: string;
    telegramUserId: bigint;
    categoryName: string | null;
    landmarkName: string | null;
    rawMessage: string;
    intent?: IntentType;
  }
) {
  const searchResult = await searchListings({
    cityId: opts.cityId,
    categoryName: opts.categoryName,
    landmarkName: opts.landmarkName,
    rawMessage: opts.rawMessage,
  });

  if (!searchResult) {
    db.queryLog.create({
      data: {
        cityId: opts.cityId,
        telegramUserId: opts.telegramUserId,
        rawMessage: opts.rawMessage,
        intent: opts.intent || IntentType.SERVICE,
        categoryName: opts.categoryName,
        landmarkName: opts.landmarkName,
        isResolved: false,
      },
    }).catch((err) => console.error('Failed to log unresolved QueryLog:', err));

    await ctx.reply('Hozircha bazada yo\'q. Yozib qo\'ydim, chiqsa aytaman.');
    return;
  }

  const resultKeyboard = new InlineKeyboard()
    .text('📋 Raqamni nusxalash', `copy_phone_${searchResult.listing.phone}`);

  if (searchResult.listing.primaryLandmark?.latitude && searchResult.listing.primaryLandmark?.longitude) {
    const mapUrl = `https://yandex.uz/maps/?pt=${searchResult.listing.primaryLandmark.longitude},${searchResult.listing.primaryLandmark.latitude}&z=16&l=map`;
    resultKeyboard.url('📍 Xarita', mapUrl);
  }
  resultKeyboard.row();

  let body = searchResult.formattedText;
  if (searchResult.hasMore) {
    await setRankedList(searchResult.listingId, searchResult.rankedListText);
    resultKeyboard.text(`Yana ${searchResult.totalMatches - 1} tasini ko'rish`, `more_${searchResult.listingId}`).row();
    body = `${searchResult.formattedText}\n\n${searchResult.rankedListText}`;
  }

  await ctx.reply(body, { parse_mode: 'HTML', reply_markup: resultKeyboard });
}

export async function handleDirectCallbacks(ctx: Context, defaultCityId: string) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;

  const userId = ctx.from.id;
  let session = userSessions[userId];
  if (!session) {
    session = { cityId: defaultCityId };
    userSessions[userId] = session;
  }

  if (data === 'start_add_me' || data === 'add_me_yes') {
    await ctx.answerCallbackQuery();
    session.step = 'CANDIDATE_CAT';
    session.candidateData = { category: session.offerCategory };
    if (session.offerCategory) {
      session.step = 'CANDIDATE_NAME';
      await ctx.reply('Ismingiz yoki mashina/do\'kon nomi?');
    } else {
      await ctx.reply('Nima qilasiz? Kasb, arenda, labo, do\'kon — yozing.');
    }
    return;
  }

  if (data === 'start_chat') {
    await ctx.answerCallbackQuery();
    session.step = undefined;
    await ctx.reply('Yozing. Masalan: labo kerak · 3-mavze gazavik');
    return;
  }

  if (data === 'add_me_no') {
    await ctx.answerCallbackQuery();
    session.step = undefined;
    session.offerCategory = undefined;
    await ctx.reply('Nima kerak? Masalan: labo kerak');
    return;
  }

  if (data.startsWith('copy_phone_')) {
    const phone = data.replace('copy_phone_', '');
    await ctx.answerCallbackQuery({ text: `📋 Telefon raqami: ${phone}`, show_alert: true });
    return;
  }

  if (data.startsWith('more_')) {
    const listingId = data.replace('more_', '');
    const rankedText = await getRankedList(listingId);

    if (!rankedText) {
      await ctx.answerCallbackQuery({ text: "Vaqti tugadi, savolni qayta yozing", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText(rankedText, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('Failed to expand ranked list:', err);
    }
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendMainMenu(ctx: Context, isAdmin: boolean) {
  const replyMenu = new Keyboard()
    .text('🔍 Qidirish').row();

  if (isAdmin) {
    replyMenu.text('➕ Ma\'lumot qo\'shish').row();
  }

  replyMenu.resized().persistent();

  await ctx.reply(
    `Nima kerak? Yozing — Olmaliq ichidan topib beraman.\n\n<i>Masalan: gazavik kerak · karzinka oldida dorixona</i>`,
    { parse_mode: 'HTML', reply_markup: replyMenu }
  );
}
