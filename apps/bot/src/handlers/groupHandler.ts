import { Context, InlineKeyboard } from 'grammy';
import { zeroLayerFilter } from '../filter/zeroLayerFilter';
import { classifyQuery } from '../filter/aiClassifier';
import { renderEmergencyTemplate, detectEmergencyCategory, isValidEmergencyCategory, searchListings, isSelfOffer, buildMediaGroupItems } from '@kimbor/core';
import { db } from '@kimbor/db';
import { scheduleMessageDeletion } from '../queue/deleteQueue';
import { setRankedList } from '../cache/rankedListCache';
import { getCommunityUrl, getCommunityLabel, getEmergencyLocalNumbers } from '../settings/appSettings';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  const telegramUserId = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);

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

  // 5. Guruh javobi tugmalari — atigi 2 tasi: "Yana ko'rish" (yashil/success,
  // bor bo'lsa, bosilganda BITTADAN qo'shib ko'rsatadi) va kanal/guruhga
  // o'tish havolasi (qizil/danger, admin panelidan sozlansa — HAR BIR
  // javobda ko'rinadi, SSH/serverga tegmasdan o'zgartiriladi). Rang —
  // Telegram Bot API 9.4 (2026-02)da qo'shilgan haqiqiy `style` maydoni
  // orqali (grammY .success()/.danger() yordamchilari). Xarita alohida
  // tugma sifatida olib tashlandi — mo'ljal nomi o'zi (yuqorida, matn
  // ichida) bosilsa xaritaga ochiladi, shu yetarli.
  const keyboard = new InlineKeyboard();
  if (searchResult.hasMore) {
    await setRankedList(searchResult.listingId, searchResult.formattedText, searchResult.compactLines);
    keyboard.text(`Yana ${searchResult.totalMatches - 1} tasini ko'rish`, `more_${searchResult.listingId}`).success().row();
  }

  const communityUrl = await getCommunityUrl();
  if (communityUrl) {
    const communityLabel = await getCommunityLabel();
    keyboard.url(communityLabel, communityUrl).danger().row();
  }

  // Rasmli yozuvlar (masalan "uy arendaga") — avval rasmlar suriladigan
  // albom sifatida, so'ng odatdagi karta+tugmalar matni ketma-ket yuboriladi.
  // Telegram sendMediaGroup tugmalarni (reply_markup) qo'llab-quvvatlamaydi,
  // shuning uchun ular alohida matn xabariga qoladi. 1 ta rasm bo'lsa
  // media-group o'rniga oddiy replyWithPhoto ishlatiladi (Telegram media-group
  // uchun kamida 2 ta element talab qiladi).
  const photoItems = buildMediaGroupItems(searchResult.listing.photoUrls);
  if (photoItems.length === 1) {
    const sentPhoto = await ctx.replyWithPhoto(photoItems[0].media, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    if (sentPhoto && ctx.chat?.id) await scheduleMessageDeletion(ctx.chat.id, sentPhoto.message_id, 15 * 60 * 1000);
  } else if (photoItems.length > 1) {
    const sentPhotos = await ctx.replyWithMediaGroup(photoItems, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    if (ctx.chat?.id) {
      for (const p of sentPhotos) await scheduleMessageDeletion(ctx.chat.id, p.message_id, 15 * 60 * 1000);
    }
  }

  const fullResponse = `${searchResult.formattedText}\n\n🕐 Bu xabar 15 daqiqada o'chadi`;

  // Javob savolga reply qilib yuboriladi
  const sentMsg = await ctx.reply(fullResponse, {
    parse_mode: 'HTML',
    reply_parameters: { message_id: ctx.message.message_id },
    reply_markup: keyboard.inline_keyboard.length > 0 ? keyboard : undefined,
  });

  // 15 minutdan keyin avtomatik o'chirish — BullMQ (Redis-based, restart-safe)
  if (sentMsg && sentMsg.message_id && ctx.chat?.id) {
    await scheduleMessageDeletion(ctx.chat.id, sentMsg.message_id, 15 * 60 * 1000);
  }
}
