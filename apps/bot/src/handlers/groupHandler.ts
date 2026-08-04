import { Context, InlineKeyboard } from 'grammy';
import { zeroLayerFilter } from '../filter/zeroLayerFilter';
import { classifyQuery } from '../filter/aiClassifier';
import { renderEmergencyTemplate, searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  const telegramUserId = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);

  // 1. 0-qavat: Free Regex & Keyword Filter
  const passedZeroLayer = zeroLayerFilter(messageText);
  if (!passedZeroLayer) return; // 90% non-search group chatter ignored silently

  // 2. 1-qavat: AI Classifier
  const classification = await classifyQuery(messageText, cityId, telegramUserId);

  // Strict Rule: confidence < 0.7 => bot stays silent
  if (classification.confidence < 0.7 || classification.intent === 'NOT_RELEVANT') {
    return;
  }

  // 3. Handle 🚨 EMERGENCY Intent (Favqulodda xavfsizlik matni)
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

  // 4. Search directory listings for the specified city
  const searchResult = await searchListings({
    cityId,
    categoryName: classification.category,
    landmarkName: classification.landmark,
    limit: 1,
  });

  if (!searchResult) {
    // Topilmasa: Guruhda JIM, QueryLog'ga isResolved=false yoziladi
    await db.queryLog.create({
      data: {
        cityId,
        telegramUserId,
        rawMessage: messageText,
        intent: classification.intent,
        categoryName: classification.category,
        landmarkName: classification.landmark,
        isResolved: false,
      },
    });
    return;
  }

  // 5. Build group response buttons
  const keyboard = new InlineKeyboard();
  if (searchResult.hasMore) {
    keyboard.text(`Yana ${searchResult.totalMatches - 1} tasini ko'rish`, `more_${searchResult.listingId}`).row();
  }
  keyboard
    .text('⭐ Baholash', `rate_${searchResult.listingId}`)
    .text('⚠️ Shikoyat', `report_${searchResult.listingId}`);

  const fullResponse = `${searchResult.formattedText}\n\n🕐 Bu xabar 15 daqiqada o'chadi`;

  // Javob savolga reply qilib yuboriladi
  const sentMsg = await ctx.reply(fullResponse, {
    reply_parameters: { message_id: ctx.message.message_id },
    reply_markup: keyboard,
  });

  // 15 minutdan keyin avtomatik o'chirish logikasi (BullMQ / setTimeout task runner)
  if (sentMsg && sentMsg.message_id && ctx.chat?.id) {
    const chatId = ctx.chat.id;
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(chatId, sentMsg.message_id);
      } catch (err) {
        // Ignore deletion error if message was already deleted
      }
    }, 15 * 60 * 1000);
  }
}
