import { Context, InlineKeyboard, Keyboard } from 'grammy';
import { buildSearchParams, isNonSearchMessage } from './searchParams';
import { classifyQuery, searchListings, isSelfOffer, matchCategoryFromText, normalizeText, renderEmergencyTemplate, detectEmergencyCategory, isValidEmergencyCategory, extractRequestedBadges, findLocalDispatcherMatch, resolveCanonicalCategoryName, extractRentalFilters, sanitizeAiLandmarkName, findAreaListings, isAreaBrowseQuery } from '@kimbor/core';
import { IntentType } from '@kimbor/types';
import { db } from '@kimbor/db';
import { setRankedList, revealNextRankedItem } from '../cache/rankedListCache';
import { getEmergencyLocalNumbers } from '../settings/appSettings';
import { buildResultKeyboard, sendListingReply } from '../utils/listingReply';
import { getAssistantReply, rememberTurn, clearHistory } from '../ai/chatAssistant';
import { handleRentalText, handleRentalCallback, clearRentState } from '../ai/rentalAgent';

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

/** /start xush kelibsiz xabari (obuna tekshiruvidan o'tgach ham chaqiriladi). */
/** Foydalanuvchi ilovasi (userapp) — ijara bo'limlari uchun (2026-10-06). */
const USER_APP_URL = `https://${process.env.DOMAIN || 'olmaliq.online'}/app/`;
export const RENTAL_BUTTONS = [
  { text: '🏠 Ijara berish', web_app: { url: `${USER_APP_URL}?go=rent_add` }, style: 'success' },
  { text: "🔎 Ijara ko'rish", web_app: { url: `${USER_APP_URL}?go=rent` }, style: 'primary' },
];

/** /start rental_add | rental — reklama deep link'i: bitta bosishda kerakli bo'limga. */
export async function sendRentalEntry(ctx: Context, mode: 'add' | 'browse') {
  const add = mode === 'add';
  await ctx.reply(
    add
      ? `<b>🏠 Uyingizni ijaraga qo'ying</b>\n\nRasm, narx va mahallani kiriting — 1 daqiqa. E'loningizni Olmaliq bo'yicha minglab odamlar ko'radi. Bepul.`
      : `<b>🔎 Olmaliqda ijara uy toping</b>\n\nKvartira, hovli uy, xona — mahalla, narx va xona soni bo'yicha.`,
    { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[add ? { text: "💬 Shu yerda joylash (savol-javob)", callback_data: 'rent:start_offer', style: 'success' } : { text: '💬 Chatda qidirish', callback_data: 'rent:start_seek', style: 'primary' }], [add ? RENTAL_BUTTONS[0] : RENTAL_BUTTONS[1]], [add ? RENTAL_BUTTONS[1] : RENTAL_BUTTONS[0]]] } as any }
  );
}

export async function sendStartWelcome(ctx: Context) {
  if (ctx.from) {
    await clearHistory(ctx.from.id);
    await clearRentState(ctx.from.id);
  }
  const webappUrl = `${process.env.WEBAPP_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}`}?v=${Date.now()}`;
  // Telegram Bot API: style = primary (ko'k) | success (yashil) | danger (qizil)
  const startKeyboard = {
    inline_keyboard: [
      [
        { text: '🔎 Uy qidiryapman', callback_data: 'rent:start_seek', style: 'primary' },
        { text: '🏠 Uyimni ijaraga beraman', callback_data: 'rent:start_offer', style: 'success' },
      ],
      [{ text: "📱 Ijara e'lonlari ilovada", web_app: { url: `${USER_APP_URL}?go=rent` } }],
      [{ text: "🌐  Webga o'tish", web_app: { url: webappUrl }, style: "primary" }],
      [{ text: "➕  O'zimni qo'shish", callback_data: "start_add_me", style: "success" }],
      [{ text: "💬  Chatda so'rash", callback_data: "start_chat", style: "primary" }],
    ],
  };
  const firstName = ctx.from?.first_name ? `, ${escapeHtml(ctx.from.first_name)}` : '';
  await ctx.reply(
    `<b>Assalomu alaykum${firstName}! 👋</b>\n\n` +
      `Men Olmaliq yordamchisiman. Sizga nima kerak — shunchaki oddiy tilda yozing, birga topamiz 🙂\n\n` +
      `🏠 <b>Uy kerakmi?</b> Masalan: <i>«2 xonali kvartira kerak, Kimyogarda»</i>\n` +
      `🔑 <b>Uyingiz bormi?</b> <i>«Uyimni ijaraga bermoqchiman»</i> deb yozing — maklersiz, bepul joylab beraman.\n` +
      `🔧 <b>Usta yoki xizmat?</b> <i>«santexnik kerak» · «3-mavzeda dorixona bormi?»</i>`,
    { parse_mode: 'HTML', reply_markup: startKeyboard as any }
  );
}

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

  // Deep link: t.me/olmaliq_bot?start=rental_add | rental
  if (messageText === '/start rental_add' || messageText === '/start rental') {
    session.step = undefined;
    await sendRentalEntry(ctx, messageText.endsWith('rental_add') ? 'add' : 'browse');
    return;
  }

  if (messageText === '/start' || messageText.startsWith('/start ')) {
    session.step = undefined;
    session.offerCategory = undefined;
    session.pendingSearch = undefined;
    session.candidateData = undefined;
    await sendStartWelcome(ctx);
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
      params: {
        cityId: session.cityId || defaultCityId,
        categoryName: pending.category,
        landmarkName: wholeCity ? null : messageText,
        rawMessage: pending.rawMessage,
        intent: IntentType.SERVICE,
        name: null,
        objectType: null,
        requestedBadges: extractRequestedBadges(pending.rawMessage),
        rentalFilters: extractRentalFilters(pending.rawMessage),
      },
      telegramUserId: telegramUserIdBigInt,
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
      const rawCategoryInput = (cand?.category || '').trim();
      let candCategory = await db.category.findFirst({
        where: {
          OR: [
            { name: { equals: rawCategoryInput, mode: 'insensitive' } },
            { synonyms: { has: rawCategoryInput.toLowerCase() } },
          ],
        },
      });

      // MUHIM (2026-09, real xato — foydalanuvchi bu ochiq savolga
      // ("Qaysi kasb yoki soha?") adashib o'zining butun so'rovini
      // ("mening documentimni yo'qotib qo'ydim...") yozib yuborgan, va bu
      // TO'LIQ GAP hech qanday tekshiruvsiz yangi Category.name sifatida
      // bazaga saqlanib qolgan edi — bazada chiqindi kategoriyalar hosil
      // bo'lishiga sabab bo'lgan): avval umumiy lug'at (sinonim/yozilish
      // xatosiga chidamli) orqali mavjud kategoriyaga moslashtirishga
      // harakat qilinadi, so'ng hali ham topilmasa — kiritilgan matn
      // HAQIQIY qisqa kasb nomiga o'xshamasa (juda uzun yoki ko'p so'zli,
      // ya'ni to'liq gap ehtimoli baland) yangi kategoriya UMUMAN
      // YARATILMAYDI, o'rniga "Umumiy"ga yoziladi.
      if (!candCategory && rawCategoryInput) {
        const canonical = resolveCanonicalCategoryName(rawCategoryInput);
        if (canonical !== rawCategoryInput) {
          candCategory = await db.category.findFirst({ where: { name: { equals: canonical, mode: 'insensitive' } } });
        }
      }

      if (!candCategory) {
        const wordCount = rawCategoryInput.split(/\s+/).filter(Boolean).length;
        const looksLikeSentence = rawCategoryInput.length > 40 || wordCount > 4;
        const safeName = !rawCategoryInput || looksLikeSentence ? 'Umumiy' : rawCategoryInput;

        candCategory = await db.category.findFirst({ where: { name: { equals: safeName, mode: 'insensitive' } } });
        if (!candCategory) {
          candCategory = await db.category.create({
            data: { name: safeName, synonyms: safeName === 'Umumiy' ? [] : [safeName.toLowerCase()] },
          });
        }
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
    await ctx.reply("Bugun ko'p savol berdingiz 🙂 Kunlik limit tugadi — ertaga yana bemalol yozing, xursand bo'lib yordam beraman!");
    return;
  }

  const activeCityId = session.cityId || defaultCityId;

  // Ijara suhbati (2026-10-08): "uy qidiryapman" / "uyim bor" — AI bilan
  // samimiy suhbat, bazadan e'lon ko'rsatish yoki e'lonni chatda joylash.
  if (await handleRentalText(ctx, activeCityId, messageText)) return;

  // Mahalliy dispecher/xizmat raqamlari (2026-09) — guruh pipeline'idagi
  // bilan bir xil mantiq, qarang: groupHandler.ts.
  const localDispatcherMatch = await findLocalDispatcherMatch(messageText, activeCityId);
  if (localDispatcherMatch) {
    const replyMarkup = localDispatcherMatch.linkUrl
      ? {
          inline_keyboard: [
            [
              {
                text: localDispatcherMatch.linkLabel || 'Havola',
                url: localDispatcherMatch.linkUrl,
                ...(localDispatcherMatch.linkButtonStyle ? { style: localDispatcherMatch.linkButtonStyle } : {}),
              },
            ],
          ],
        }
      : undefined;
    await ctx.reply(localDispatcherMatch.formattedText, { parse_mode: 'HTML', reply_markup: replyMarkup as any });
    db.queryLog.create({
      data: {
        cityId: activeCityId,
        telegramUserId: telegramUserIdBigInt,
        rawMessage: messageText,
        intent: 'CONTACT',
        categoryName: localDispatcherMatch.label,
        isResolved: true,
        confidence: 1,
      },
    }).catch((err) => console.error('Failed to log local-dispatcher QueryLog:', err));
    return;
  }

  const classification = await classifyQuery(messageText, activeCityId, telegramUserIdBigInt);
  // QueryLog gigiyenasi — "none"/"null" kabi bekorchi qiymatlar mo'ljal
  // sifatida yozilib qolmasin (qarang: sanitizeAiLandmarkName izohi).
  classification.landmark = sanitizeAiLandmarkName(classification.landmark);
  const dictMatch = matchCategoryFromText(normalizeText(messageText));
  const categoryGuess = classification.category || dictMatch?.canonicalName || null;

  // Favqulodda holat — shaxsiy chatda ham xuddi guruhdagidek darhol
  // javob beriladi (avval bu yerda umuman ishlanmas edi, oddiy qidiruvga
  // tushib "bazada yo'q" deb javob berardi — xavfsizlik nuqtai nazaridan
  // xato edi).
  if (classification.intent === 'EMERGENCY') {
    const category = isValidEmergencyCategory(classification.category)
      ? (classification.category as string)
      : detectEmergencyCategory(messageText) || 'gas_leak';
    const localNumbers = await getEmergencyLocalNumbers(activeCityId);
    const emergencyMessage =
      (await renderEmergencyTemplate(category, 'lotin', localNumbers)) ||
      `🚨 FAVQULODDA HOLAT!\n\nDarhol 112 ga qo'ng'iroq qiling — Yagona qutqaruv xizmati.\n\n📞 112`;
    await ctx.reply(emergencyMessage, { parse_mode: 'HTML' });
    return;
  }

  // EMERGENCY yuqorida allaqachon qaytib ketgan (return), shu sabab bu
  // yerga faqat EMERGENCY BO'LMAGAN xabarlar yetib keladi.
  if (isSelfOffer(messageText)) {
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

  // Hudud-so'rovi ("Bo'stonda nima bor?") — 2026-09, guruhdagi bilan bir
  // xil mantiq (qarang: groupHandler.ts). Aniq kategoriya YO'Q, lekin
  // mo'ljal ANIQ bo'lsa — shu mo'ljaldagi barcha yozuvlar ro'yxat qilib
  // yuboriladi, oddiy qidiruv/aniqlashtirish oqimidan OLDIN.
  // Ish e'loni / kommunal holat savoli — guruhdagidek kartochka yuborilmaydi,
  // suhbatdosh AI javob beradi.
  if (isNonSearchMessage(messageText)) {
    await ctx.replyWithChatAction('typing').catch(() => {});
    const reply = await getAssistantReply({
      cityId: activeCityId,
      userId: Number(telegramUserIdBigInt),
      userText: messageText,
      searchNote: 'qidiruv emas (ish e\'loni yoki kommunal holat savoli)',
    });
    await ctx.reply(reply);
    return;
  }

  if (!classification.category && isAreaBrowseQuery(messageText)) {
    const areaResult = await findAreaListings(activeCityId, classification.landmark, messageText);
    if (areaResult) {
      await ctx.reply(areaResult.formattedText, { parse_mode: 'HTML' });
      return;
    }
  }

  // Guruh bilan AYNAN bir xil parametrlar (qarang: searchParams.ts).
  await runPrivateSearch(ctx, {
    params: buildSearchParams(activeCityId, messageText, classification),
    telegramUserId: telegramUserIdBigInt,
    confidence: classification.confidence,
    aiSource: classification.source ?? null,
  });
}

async function runPrivateSearch(
  ctx: Context,
  input: {
    params: ReturnType<typeof buildSearchParams>;
    telegramUserId: bigint;
    confidence?: number;
    aiSource?: string | null;
  }
) {
  const opts = { ...input.params, telegramUserId: input.telegramUserId, confidence: input.confidence, aiSource: input.aiSource };
  const searchResult = await searchListings(input.params);

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
        confidence: opts.confidence,
        aiSource: opts.aiSource ?? null,
      },
    }).catch((err) => console.error('Failed to log unresolved QueryLog:', err));

    // (2026-10) Quruq "bazada yo'q" o'rniga muloyim AI suhbatdosh: oddiy
    // gap bo'lsa suhbatlashadi, qidiruv bo'lsa yo'qligini aytib,
    // foydalanuvchida ma'lumot bo'lsa yuborishini so'raydi.
    const searchNote = opts.categoryName
      ? `topilmadi (so'ralgan soha: ${opts.categoryName}${opts.landmarkName ? `, joy: ${opts.landmarkName}` : ''})`
      : opts.intent === IntentType.NOT_RELEVANT
        ? "qidiruv emas (oddiy suhbat yoki savol)"
        : 'topilmadi';
    await ctx.replyWithChatAction('typing').catch(() => {});
    const reply = await getAssistantReply({
      cityId: opts.cityId,
      userId: Number(opts.telegramUserId),
      userText: opts.rawMessage,
      searchNote,
    });
    await ctx.reply(reply);
    return;
  }

  rememberTurn(Number(opts.telegramUserId), 'user', opts.rawMessage).catch(() => {});
  rememberTurn(
    Number(opts.telegramUserId),
    'model',
    `[Bazadan topib, kartochka yuborildi: ${searchResult.listing.name} — ${searchResult.listing.category?.name || ''}]`
  ).catch(() => {});

  // "Raqamni nusxalash" tugmasi olib tashlangan — telefon raqami <code>
  // formatida (bosilsa o'zi nusxalanadi). "📍 Lokatsiya" tugmasi esa
  // (2026-09, Zapravkalar uchun) admin mapUrl qo'ygan bo'lsa qaytadan
  // qo'shiladi (buildResultKeyboard ichida).
  if (searchResult.hasMore) {
    const firstHadPhoto = !!(searchResult.listing.photoUrls && searchResult.listing.photoUrls.length > 0);
    await setRankedList(searchResult.listingId, searchResult.otherMatches, firstHadPhoto);
  }
  const resultKeyboard = await buildResultKeyboard(searchResult.otherMatches.length, searchResult.listingId, searchResult.listing.mapUrl);

  await sendListingReply(ctx, {
    formattedText: searchResult.formattedText,
    photoUrls: searchResult.listing.photoUrls,
    keyboard: resultKeyboard,
  });

  // Muvaffaqiyatli topildi — ilgari bu holat umuman qayd etilmasdi
  // (2026-09 tuzatildi, xuddi groupHandler.ts'dagi kabi).
  db.queryLog.create({
    data: {
      cityId: opts.cityId,
      telegramUserId: opts.telegramUserId,
      rawMessage: opts.rawMessage,
      intent: opts.intent || IntentType.SERVICE,
      categoryName: opts.categoryName,
      landmarkName: opts.landmarkName,
      isResolved: true,
      confidence: opts.confidence,
      aiSource: opts.aiSource ?? null,
    },
  }).catch((err) => console.error('Failed to log resolved QueryLog:', err));
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

  if (await handleRentalCallback(ctx, session.cityId || defaultCityId, data)) return;

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
    await ctx.reply('Bemalol yozing 🙂 Nima kerak? Masalan: «labo kerak» yoki «3-mavzeda gazavik bormi?»');
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
    const revealed = await revealNextRankedItem(listingId);

    if (!revealed) {
      await ctx.answerCallbackQuery({ text: "Vaqti tugadi, savolni qayta yozing", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery();

    // Navbatdagi moslik: agar ekranda hozir turgan xabar HAM, yangi
    // yozuv HAM matn-only bo'lsa (rasm yo'q) — mavjud xabarning o'zi
    // tahrirlanadi (yangi post yuborilmaydi), shunda "Yana" bir necha
    // marta bosilsa ham chatda ortiqcha post to'planib qolmaydi. Rasmli
    // (Rich Message) yozuvlar esa hamon o'zining alohida postida
    // yuboriladi (2026-09, ikkinchi marta tuzatildi — qarang:
    // rankedListCache.ts).
    const isGroupChat = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
    const keyboard = await buildResultKeyboard(revealed.remaining, listingId, revealed.item.mapUrl);

    try {
      await sendListingReply(ctx, {
        formattedText: revealed.item.formattedText,
        photoUrls: revealed.item.photoUrls,
        keyboard,
        editMessage: revealed.canEdit,
        autoDeleteChatId: revealed.canEdit ? undefined : (isGroupChat ? ctx.chat?.id : undefined),
      });
    } catch (err) {
      console.error('Failed to send next ranked item:', err);
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
