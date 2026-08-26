import { Context, InlineKeyboard } from 'grammy';
import { zeroLayerFilter } from '../filter/zeroLayerFilter';
import { classifyQuery } from '../filter/aiClassifier';
import { renderEmergencyTemplate, searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';
import { scheduleMessageDeletion } from '../queue/deleteQueue';
import { setRankedList } from '../cache/rankedListCache';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  const telegramUserId = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);

  // 1. 0-qavat: Free Regex & Keyword Filter
  const passedZeroLayer = zeroLayerFilter(messageText);
  if (!passedZeroLayer) return; // 90% non-search group chatter ignored silently

  // 2. 1-qavat: AI Classifier
  const classification = await classifyQuery(messageText, cityId, telegramUserId);

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
  const searchResult = await searchListings({
    cityId,
    categoryName: classification.category,
    landmarkName: classification.landmark,
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

  // 5. Build group response buttons — faqat haqiqiy qiymat qo'shadigan
  // tugmalar: "Yana ko'rish" (agar ko'proq mos yozuv bo'lsa) va "Xarita"
  // (agar koordinata bor bo'lsa). "Baholash"/"Shikoyat" tugmalari har bir
  // javobda doim ko'rinib, ortiqcha shovqin va chalkashlik keltirib
  // chiqargani uchun olib tashlangan — sodda va aniq javob ustuvor.
  const keyboard = new InlineKeyboard();
  if (searchResult.hasMore) {
    await setRankedList(searchResult.listingId, searchResult.rankedListText);
    keyboard.text(`Yana ${searchResult.totalMatches - 1} tasini ko'rish`, `more_${searchResult.listingId}`).row();
  }

  if (searchResult.listing.primaryLandmark?.latitude && searchResult.listing.primaryLandmark?.longitude) {
    const mapUrl = `https://yandex.uz/maps/?pt=${searchResult.listing.primaryLandmark.longitude},${searchResult.listing.primaryLandmark.latitude}&z=16&l=map`;
    keyboard.url('📍 Xarita', mapUrl);
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
