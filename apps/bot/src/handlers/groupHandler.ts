import { Context } from 'grammy';
import { zeroLayerFilter } from '../filter/zeroLayerFilter';
import { classifyQuery } from '../filter/aiClassifier';
import { renderEmergencyTemplate, detectEmergencyCategory, isValidEmergencyCategory, searchListings, isSelfOffer } from '@kimbor/core';
import { db } from '@kimbor/db';
import { setRankedList } from '../cache/rankedListCache';
import { getEmergencyLocalNumbers } from '../settings/appSettings';
import { buildResultKeyboard, sendListingReply } from '../utils/listingReply';
// MUHIM: moderatsiya kodi (enforceModeration) TAYYOR va tekshirilgan, lekin
// admin so'roviga ko'ra HOZIRCHA botga ULANMAGAN — chaqiruv ataylab
// izohga olingan (pastga qarang). Fayllar (moderation/*.ts,
// ModerationLog jadvali) o'z holida saqlanadi, faqat botda ISHLAMAYDI.
// Qayta yoqish uchun: pastdagi 2 qatorni (import + chaqiruv) izohdan
// chiqarish kifoya.
// import { enforceModeration } from '../moderation/enforceModeration';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  const telegramUserId = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);

  // 0. Xavfsizlik-moderatsiya — HOZIRCHA O'CHIRILGAN (admin so'rovi, 2026-09).
  // Kod tayyor, lekin botda ishlamasin deb ataylab chaqirilmayapti.
  // const wasModerated = await enforceModeration(ctx, messageText);
  // if (wasModerated) return;

  // 1. 0-qavat: Free Regex & Keyword Filter
  const passedZeroLayer = zeroLayerFilter(messageText);
  if (!passedZeroLayer) return; // 90% non-search group chatter ignored silently

  // 2. 1-qavat: AI Classifier
  const classification = await classifyQuery(messageText, cityId, telegramUserId);

  // 2b. E'lon vs so'rov. "menda labo bor / yo'lga chiqaman" — odam O'ZIDA
  // bor narsani taklif qiladi, qidirmaydi. Gemini SERVICE deb xato qilsa ham,
  // bazadan kartochka yuborilmaydi.
  if (classification.intent !== 'EMERGENCY' && isSelfOffer(messageText)) {
    db.queryLog.create({
      data: {
        cityId,
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
      renderEmergencyTemplate(category, 'lotin', localNumbers) ||
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
    await setRankedList(searchResult.listingId, searchResult.otherMatches);
  }
  const keyboard = await buildResultKeyboard(searchResult.otherMatches.length, searchResult.listingId);

  await sendListingReply(ctx, {
    formattedText: searchResult.formattedText,
    photoUrls: searchResult.listing.photoUrls,
    keyboard,
    replyToMessageId: ctx.message.message_id,
    autoDeleteChatId: ctx.chat?.id,
  });
}
