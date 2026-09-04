import { Context, InlineKeyboard } from 'grammy';
import { zeroLayerFilter } from '../filter/zeroLayerFilter';
import { classifyQuery } from '../filter/aiClassifier';
import { renderEmergencyTemplate, searchListings, isSelfOffer } from '@kimbor/core';
import { db } from '@kimbor/db';
import { scheduleMessageDeletion } from '../queue/deleteQueue';
import { setRankedList } from '../cache/rankedListCache';
import { getCommunityUrl } from '../settings/appSettings';

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
      },
    }).catch((err) => console.error('Failed to log self-offer QueryLog:', err));
    return;
  }

  // 3. Handle 🚨 EMERGENCY Intent (Favqulodda xavfsizlik matni) — ishonchlilik
  // darajasidan qat'i nazar tekshiriladi, chunki xavfsizlik ustuvor
  if (classification.intent === 'EMERGENCY') {
    const category = classification.category || 'gas_leak';
    const emergencyMessage = renderEmergencyTemplate(category, 'lotin');

    if (emergencyMessage) {
      // 1-darajali xabar: usta berilmaydi va O'CHMAYDI
      await ctx.reply(emergencyMessage, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
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
    keyboard.url('📣 Kanal/Guruhga o\'tish', communityUrl).danger().row();
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
