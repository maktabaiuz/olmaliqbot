import { Context } from 'grammy';
import { zeroLayerFilter, classifyQuery, renderEmergencyTemplate, detectEmergencyCategory, isValidEmergencyCategory, searchListings, isSelfOffer, isJobVacancy, isUtilityStatusQuestion, extractRequestedBadges } from '@kimbor/core';
import { db } from '@kimbor/db';
import { setRankedList } from '../cache/rankedListCache';
import { getEmergencyLocalNumbers } from '../settings/appSettings';
import { buildResultKeyboard, sendListingReply } from '../utils/listingReply';
import { enforceModeration } from '../moderation/enforceModeration';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  const telegramUserId = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);
  // "Guruhlar" bo'limidagi so'rov/javob statistikasi uchun (2026-09) —
  // shu guruhning chatId'si har bir QueryLog yozuviga qo'shiladi.
  const chatId = ctx.chat?.id ? BigInt(ctx.chat.id) : null;

  // 0. Xavfsizlik-moderatsiya ("Foydali botlar", 2026-09) — har bir filtr
  // GURUH DARAJASIDA admin panelida yoqiladi/o'chiriladi (standart holat:
  // yangi guruhda hammasi o'chiq). enforceModeration() ichida shu guruhda
  // hech narsa yoqilmagan bo'lsa, darhol (deyarli bepul) chiqib ketadi.
  const wasModerated = await enforceModeration(ctx, messageText);
  if (wasModerated) return;

  // 1. 0-qavat: Free Regex & Keyword Filter
  const passedZeroLayer = zeroLayerFilter(messageText);
  if (!passedZeroLayer) return; // 90% non-search group chatter ignored silently

  // 2. 1-qavat: AI Classifier
  const classification = await classifyQuery(messageText, cityId, telegramUserId);

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
    (isSelfOffer(messageText) || isJobVacancy(messageText) || isUtilityStatusQuestion(messageText))
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

    const localNumbers = await getEmergencyLocalNumbers();
    const emergencyMessage =
      (await renderEmergencyTemplate(category, 'lotin', localNumbers)) ||
      `🚨 FAVQULODDA HOLAT!\n\nDarhol 112 ga qo'ng'iroq qiling — Yagona qutqaruv xizmati.\n\n📞 112`;

    // 1-darajali xabar: usta berilmaydi va O'CHMAYDI
    await ctx.reply(emergencyMessage, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  // 4. Bazani qidirish — AI klassifikator ishonchsiz/noaniq (masalan
  // NOT_RELEVANT) deb baholagan bo'lsa ham, ATAYIN OLDIN qidiriladi. Sabab:
  // admin bazaga qo'shganda "odamlar buni qanday so'rashi mumkin" deb jargon
  // iboralarni oldindan yozib qo'ygan bo'ladi (masalan "Qaroqtoy choyxona").
  // AI "aniq savol emas" deb noto'g'ri xulosa qilgan taqdirda ham, agar
  // bazada TO'G'RIDAN-TO'G'RI mos yozuv topilsa — bu haqiqiy, kuchli signal,
  // AI xulosasidan ustunroq. Faqat HECH NARSA topilmagandagina AI ning
  // ishonchlilik bahosiga qarab javob berish-bermaslik hal qilinadi.
  const isSeeking =
    classification.intent !== 'NOT_RELEVANT';
  const searchResult = await searchListings({
    cityId,
    // NOT_RELEVANT bo'lsa kategoriya so'zi (labo) bilan qidirilmaydi —
    // aks holda e'lon ham kartochka ochardi. Jargon ibora esa rawMessage
    // orqali hali ham topiladi.
    categoryName: isSeeking ? classification.category : null,
    landmarkName: isSeeking ? classification.landmark : null,
    rawMessage: messageText,
    intent: classification.intent,
    name: isSeeking ? classification.name : null,
    requestedBadges: extractRequestedBadges(messageText),
  });

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
  if (searchResult.hasMore) {
    const firstHadPhoto = !!(searchResult.listing.photoUrls && searchResult.listing.photoUrls.length > 0);
    await setRankedList(searchResult.listingId, searchResult.otherMatches, firstHadPhoto);
  }
  const keyboard = await buildResultKeyboard(searchResult.otherMatches.length, searchResult.listingId, searchResult.listing.mapUrl);

  await sendListingReply(ctx, {
    formattedText: searchResult.formattedText,
    photoUrls: searchResult.listing.photoUrls,
    keyboard,
    replyToMessageId: ctx.message.message_id,
    autoDeleteChatId: ctx.chat?.id,
  });

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
      confidence: classification.confidence,
    },
  }).catch((err) => console.error('Failed to log resolved QueryLog:', err));
}
