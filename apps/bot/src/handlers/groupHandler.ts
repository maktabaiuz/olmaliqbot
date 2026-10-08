import { Context } from 'grammy';
import { buildSearchParams, isNonSearchMessage } from './searchParams';
import { isInformationalPost } from '@kimbor/core';
import { zeroLayerFilter, classifyQuery, renderEmergencyTemplate, detectEmergencyCategory, isValidEmergencyCategory, searchListings, isSelfOffer, isJobVacancy, isUtilityStatusQuestion, extractRequestedBadges, findLocalDispatcherMatch, extractRentalFilters, sanitizeAiLandmarkName, findAreaListings, isAreaBrowseQuery, recordLearnedTermCandidates } from '@kimbor/core';
import { db } from '@kimbor/db';
import { setRankedList } from '../cache/rankedListCache';
import { getEmergencyLocalNumbers } from '../settings/appSettings';
import { buildResultKeyboard, sendListingReply } from '../utils/listingReply';
import { enforceModeration } from '../moderation/enforceModeration';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  // 2026-09-29, kod tahlilida topilgan bo'shliq: xabar biror RASMga
  // (masalan reklama-e'lon posti) javoban ("reply") yozilgan bo'lsa, bot
  // o'sha rasmni KO'RMAYDI — "Bu qaysi?"/"Shu ochiqmi?" kabi savollar
  // odatda AYNAN shu suratdagi narsaga ishora qiladi. Bu — Telegram'ning
  // o'zi bergan, hech qanday qo'shimcha ruxsat/so'rov talab qilmaydigan
  // TAYYOR signal (searchEngine.ts'dagi "qaysi" himoyasi bilan bir xil
  // qoida bo'yicha ishlatiladi — pastga qarang).
  const isReplyToPhoto = !!(ctx.message as any)?.reply_to_message?.photo;

  // 2026-09-28, "Guruhlar" chuqur tahlili ("javob tezligi" ko'rsatkichi
  // uchun) — funksiya boshidan oxirigacha (yoki JIM qolish qaroriga
  // qadar) ketgan vaqt, har bir QueryLog yozuviga qo'shiladi.
  const startTime = Date.now();

  const telegramUserId = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);
  // "Guruhlar" bo'limidagi so'rov/javob statistikasi uchun (2026-09) —
  // shu guruhning chatId'si har bir QueryLog yozuviga qo'shiladi.
  const chatId = ctx.chat?.id ? BigInt(ctx.chat.id) : null;

  // 2026-09-28, "Guruhlar" chuqur tahlili — QueryLog FAQAT bot uchun
  // tegishli so'rovlarni (0-qavat filtrdan o'tganlarini, ~10%) saqlaydi,
  // shuning uchun guruhning HAQIQIY umumiy faolligi (faol/jim a'zolar
  // nisbati, eng faol odamlar, kunlik xabar hajmi, bot foydaliligi %)
  // bu yerdan bilinmaydi. Shu sabab BUTUN filtrlashdan OLDIN, HAR bir
  // matnli xabar (matnisiz — faqat kim va qachon) alohida, yengil
  // jadvalga yoziladi. Fire-and-forget: botning javob berish tezligiga
  // ta'sir qilmasin.
  if (chatId) {
    db.groupMessageEvent
      .create({ data: { chatId, telegramUserId } })
      .catch((err) => console.error('Failed to log GroupMessageEvent:', err));
  }

  // 0. Xavfsizlik-moderatsiya ("Foydali botlar", 2026-09) — har bir filtr
  // GURUH DARAJASIDA admin panelida yoqiladi/o'chiriladi (standart holat:
  // yangi guruhda hammasi o'chiq). enforceModeration() ichida shu guruhda
  // hech narsa yoqilmagan bo'lsa, darhol (deyarli bepul) chiqib ketadi.
  const wasModerated = await enforceModeration(ctx, messageText);
  if (wasModerated) return;

  // 1. 0-qavat: Free Regex & Keyword Filter
  const passedZeroLayer = zeroLayerFilter(messageText);
  if (!passedZeroLayer) return; // 90% non-search group chatter ignored silently

  // 1b. Mahalliy dispecher/xizmat raqamlari (2026-09, admin so'roviga ko'ra
  // qo'shildi) — "Mahalliy raqamlar" ekranida admin qo'shgan qo'shimcha
  // raqamlar (mahalliy jargon so'zlar bilan). AI'dan OLDIN tekshiriladi —
  // aniq jargon moslik topilsa, AI so'roviga umuman hojat yo'q va bot
  // HECH QANDAY "DARHOL bunday qiling" shablonisiz, FAQAT so'ralgan
  // ma'lumotni (nomi + telefon) qaytaradi (bular hayotiy xavf emas,
  // oddiy ma'lumot-so'rov).
  // Ma'lumot posti (ko'p raqamli ro'yxat, uzun e'lon) — savol emas, hech
  // narsa qidirilmaydi, dispetcher raqamlari ham (2026-10-07).
  if (isInformationalPost(messageText)) return;
  const localDispatcherMatch = await findLocalDispatcherMatch(messageText, cityId);
  if (localDispatcherMatch) {
    // Reklama/havola tugmasi — admin qo'ygan bo'lsa (Broadcast'dagi bilan
    // bir xil rang tizimi: primary/success/danger).
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
    await ctx.reply(localDispatcherMatch.formattedText, {
      parse_mode: 'HTML',
      reply_parameters: { message_id: ctx.message.message_id },
      reply_markup: replyMarkup as any,
    });
    db.queryLog.create({
      data: {
        cityId,
        chatId,
        telegramUserId,
        rawMessage: messageText,
        intent: 'CONTACT',
        categoryName: localDispatcherMatch.label,
        landmarkName: null,
        isResolved: true,
        confidence: 1,
      },
    }).catch((err) => console.error('Failed to log local-dispatcher QueryLog:', err));
    return;
  }

  // 2. 1-qavat: AI Classifier
  const classification = await classifyQuery(messageText, cityId, telegramUserId);
  // QueryLog gigiyenasi — "none"/"null" kabi bekorchi qiymatlar mo'ljal
  // sifatida yozilib qolmasin (qarang: sanitizeAiLandmarkName izohi).
  classification.landmark = sanitizeAiLandmarkName(classification.landmark);

  // 2b. E'lon vs so'rov. "menda labo bor / yo'lga chiqaman" — odam O'ZIDA
  // bor narsani taklif qiladi, qidirmaydi. Gemini SERVICE deb xato qilsa ham,
  // bazadan kartochka yuborilmaydi.
  // 2c. Ish e'loni ("podsobnik kerak", "ishchi kerak, oylik yaxshi") —
  // katalogimizga aloqasi yo'q: bu odam O'ZIGA xodim qidiryapti, bizdan
  // usta so'ramayapti. AI buni ishonch bilan "SERVICE" deb xato baholagani
  // (va bot aloqasiz "Kafelchi"ni yuborgani) real skrinshot bilan
  // tasdiqlangan, shuning uchun bu yerda AI dan QAT'I NAZAR to'xtatiladi.
  if (
    classification.intent !== 'EMERGENCY' &&
    (isSelfOffer(messageText) || isNonSearchMessage(messageText))
  ) {
    db.queryLog.create({
      data: {
        cityId,
        chatId,
        telegramUserId,
        rawMessage: messageText,
        intent: 'NOT_RELEVANT',
        categoryName: classification.category,
        landmarkName: classification.landmark,
        isResolved: false,
        confidence: classification.confidence,
        aiSource: classification.source ?? null,
      },
    }).catch((err) => console.error('Failed to log self-offer QueryLog:', err));
    return;
  }

  // 3. Handle 🚨 EMERGENCY Intent (Favqulodda xavfsizlik matni) — ishonchlilik
  // darajasidan qat'i nazar tekshiriladi, chunki xavfsizlik ustuvor.
  //
  // MUHIM (2026-09 tuzatildi): AI klassifikatorning "category" taxmini
  // (masalan "gaz") ko'pincha shablon kalitiga ("gas_leak") mos kelmas edi
  // — natijada renderEmergencyTemplate null qaytarib, HAQIQIY favqulodda
  // xabarga BOT UMUMAN JAVOB BERMAY QOLAR EDI. Endi: (1) AI taxmini avval
  // haqiqiy shablon kalitlariga solishtiriladi, (2) mos kelmasa xabar
  // matnining o'zidan ANIQ kalit izlanadi (detectEmergencyCategory), (3)
  // baribir topilmasa — SUKUT SAQLASH O'RNIGA umumiy xavfsizlik xabari
  // yuboriladi (hayotga xavf bo'lganda jim turish xato bo'lardi).
  if (classification.intent === 'EMERGENCY') {
    const guessedCategory = classification.category || '';
    const category = isValidEmergencyCategory(guessedCategory)
      ? guessedCategory
      : detectEmergencyCategory(messageText) || 'gas_leak';

    const localNumbers = await getEmergencyLocalNumbers(cityId);
    const emergencyMessage =
      (await renderEmergencyTemplate(category, 'lotin', localNumbers)) ||
      `🚨 FAVQULODDA HOLAT!\n\nDarhol 112 ga qo'ng'iroq qiling — Yagona qutqaruv xizmati.\n\n📞 112`;

    // 1-darajali xabar: usta berilmaydi va O'CHMAYDI
    await ctx.reply(emergencyMessage, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  // 3a2. "Mahalliy so'zlar" — LIVE o'rganish (2026-09-28, aniq shunday
  // so'ralgan: "hozirdan boshlab, har bitta user yozganini o'qib, live
  // rejimda saqlab yursin"). AI allaqachon kategoriya/mo'ljalni aniqlab
  // bo'lgan (yoki aniqlay olmagan — baribir foydali signal) shu nuqtada,
  // xabar HAQIQIY so'rov ekani ham tasdiqlangan (EMERGENCY/o'z-e'lon/ish-
  // e'loni emasligi yuqorida allaqachon elangan). Fire-and-forget — botning
  // javob berish tezligiga ta'sir qilmaydi, natija esa DOIM (topilgan-
  // topilmaganidan qat'i nazar) qayd etiladi, chunki "javobsiz qolgan"
  // so'rovlar ham qaysi so'zlar bilan so'ralganini ko'rsatadi.
  recordLearnedTermCandidates(cityId, messageText, classification.category, classification.landmark).catch((err) =>
    console.error('Failed to record learned term candidates:', err)
  );

  // 3b. Hudud-so'rovi ("Bo'stonda nima bor?") — 2026-09, foydalanuvchi
  // talabi bilan qo'shildi. Aniq kategoriya YO'Q, lekin mo'ljal ANIQ
  // bo'lsa — bu ATAYLAB shunday (odam "hamma narsani" so'ragan, bitta
  // kasbni emas). Oddiy qidiruvdan ("4"-bosqich) OLDIN, mustaqil
  // tekshiriladi: agar shu mo'ljalda haqiqiy yozuv(lar) topilsa, ular
  // ro'yxat qilib yuboriladi; topilmasa — oddiy qidiruv yo'liga davom
  // etiladi (pastga qarang), xatti-harakat o'zgarmaydi.
  if (!classification.category && isAreaBrowseQuery(messageText)) {
    const areaResult = await findAreaListings(cityId, classification.landmark, messageText);
    if (areaResult) {
      await ctx.reply(areaResult.formattedText, {
        parse_mode: 'HTML',
        reply_parameters: { message_id: ctx.message.message_id },
      });
      db.queryLog.create({
        data: {
          cityId,
          chatId,
          telegramUserId,
          rawMessage: messageText,
          intent: classification.intent,
          categoryName: null,
          landmarkName: areaResult.landmarkName,
          isResolved: true,
          confidence: classification.confidence,
        aiSource: classification.source ?? null,
          responseTimeMs: Date.now() - startTime,
        },
      }).catch((err) => console.error('Failed to log area-listing QueryLog:', err));
      return;
    }
  }

  // 4. Bazani qidirish — AI klassifikator ishonchsiz/noaniq (masalan
  // NOT_RELEVANT) deb baholagan bo'lsa ham, ATAYIN OLDIN qidiriladi. Sabab:
  // admin bazaga qo'shganda "odamlar buni qanday so'rashi mumkin" deb jargon
  // iboralarni oldindan yozib qo'ygan bo'ladi (masalan "Qaroqtoy choyxona").
  // AI "aniq savol emas" deb noto'g'ri xulosa qilgan taqdirda ham, agar
  // bazada TO'G'RIDAN-TO'G'RI mos yozuv topilsa — bu haqiqiy, kuchli signal,
  // AI xulosasidan ustunroq. Faqat HECH NARSA topilmagandagina AI ning
  // ishonchlilik bahosiga qarab javob berish-bermaslik hal qilinadi.
  const searchResult = await searchListings({ ...buildSearchParams(cityId, messageText, classification), isReplyToPhoto });

  if (!searchResult) {
    // Topilmasa: Guruhda JIM. Biz bazaga kiritmagan mavzu bo'yicha "ma'lumot
    // yo'q" deb javob berish keraksiz shovqin va chalkashlik keltirib
    // chiqargani uchun ATAYIN olib tashlangan — bot faqat HAQIQATDA bazada
    // bor narsaga javob beradi (to'g'ridan-to'g'ri yoki jargon/o'xshashlik
    // orqali), aks holda sukut saqlaydi.
    db.queryLog.create({
      data: {
        cityId,
        chatId,
        telegramUserId,
        rawMessage: messageText,
        intent: classification.intent,
        categoryName: classification.category,
        landmarkName: classification.landmark,
        isResolved: false,
        confidence: classification.confidence,
        aiSource: classification.source ?? null,
      },
    }).catch((err) => console.error('Failed to log unresolved QueryLog:', err));
    return;
  }

  // 5. Guruh javobi tugmalari — "Yana ko'rish" (yashil/success, bor bo'lsa,
  // bosilganda NAVBATDAGI moslikni O'ZINING alohida postida yuboradi — bu
  // 2026-09'da tuzatildi: avval mavjud xabarga matn qo'shib qo'yardi, bu
  // rasmli yozuvlarda matn/rasmlarni aralashtirib yuborardi) va kanal/
  // guruhga o'tish havolasi (qizil/danger, admin panelidan sozlansa — HAR
  // BIR postda ko'rinadi).
  const keyboard = await buildResultKeyboard(searchResult.otherMatches.length, searchResult.listingId, searchResult.listing.mapUrl);

  const sentId = await sendListingReply(ctx, {
    formattedText: searchResult.formattedText,
    photoUrls: searchResult.listing.photoUrls,
    keyboard,
    replyToMessageId: ctx.message.message_id,
    autoDeleteChatId: ctx.chat?.id,
  });
  // "Yana" navbati shu POSTga bog'lanadi (chat + xabar ID)
  if (searchResult.hasMore && sentId && ctx.chat) {
    await setRankedList(
      ctx.chat.id,
      sentId,
      { formattedText: searchResult.formattedText, photoUrls: searchResult.listing.photoUrls || [], mapUrl: searchResult.listing.mapUrl || null },
      searchResult.otherMatches
    );
  }

  // Muvaffaqiyatli topildi — "Guruhlar" bo'limidagi "so'rov/javob"
  // statistikasi shu yozuvga tayanadi (2026-09, ilgari BU HOLAT umuman
  // qayd etilmasdi, shu sabab statistika har doim noto'g'ri chiqardi).
  db.queryLog.create({
    data: {
      cityId,
      chatId,
      telegramUserId,
      rawMessage: messageText,
      intent: classification.intent,
      categoryName: classification.category,
      landmarkName: classification.landmark,
      isResolved: true,
      // Qaysi yozuv ko'rsatildi — Baza'dagi "necha marta ko'rsatildi" statistikasi shunga tayanadi
      resolvedListingId: searchResult.listingId,
      confidence: classification.confidence,
        aiSource: classification.source ?? null,
      responseTimeMs: Date.now() - startTime,
    },
  }).catch((err) => console.error('Failed to log resolved QueryLog:', err));
}
