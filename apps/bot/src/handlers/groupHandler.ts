import { Context, InlineKeyboard } from 'grammy';
import { zeroLayerFilter } from '../filter/zeroLayerFilter';
import { classifyQuery } from '../filter/aiClassifier';
import { renderEmergencyTemplate, searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';

export async function handleGroupMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText) return;

  // 1. 0-qavat: Free Regex & Keyword Filter
  const passedZeroLayer = zeroLayerFilter(messageText);
  if (!passedZeroLayer) return; // 90% of group chatter ignored here

  // 2. 1-qavat: AI Classifier
  const classification = await classifyQuery(messageText);

  // Strict Rule: confidence < 0.7 => bot stays silent
  if (classification.confidence < 0.7 || classification.intent === 'NOT_RELEVANT') {
    return;
  }

  // 3. Handle Emergency intent
  if (classification.intent === 'EMERGENCY') {
    const category = classification.category || 'gas_leak';
    const emergencyMessage = renderEmergencyTemplate(category, 'lotin');
    
    if (emergencyMessage) {
      await ctx.reply(emergencyMessage, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
    return;
  }

  // 4. Search directory listings
  const searchResult = await searchListings({
    cityId,
    categoryName: classification.category,
    landmarkName: classification.landmark,
    limit: 1,
  });

  if (!searchResult) {
    // Log missing query into query_logs table (So'rovlar sikli)
    if (ctx.from) {
      await db.queryLog.create({
        data: {
          cityId,
          telegramUserId: BigInt(ctx.from.id),
          rawMessage: messageText,
          intent: classification.intent,
          categoryName: classification.category,
          landmarkName: classification.landmark,
          isResolved: false,
        },
      });
    }
    // Bot stays silent in group when no listing found
    return;
  }

  // 5. Build response buttons
  const keyboard = new InlineKeyboard();
  if (searchResult.hasMore) {
    keyboard.text(`Yana ${searchResult.totalMatches - 1} tasini ko'rish`, `more_${searchResult.listingId}`).row();
  }
  keyboard.text('⭐ Baholash', `rate_${searchResult.listingId}`).text('⚠️ Shikoyat', `report_${searchResult.listingId}`);

  const fullResponse = `${searchResult.formattedText}\n\n🕐 Bu xabar 15 daqiqada o'chadi`;

  const sentMsg = await ctx.reply(fullResponse, {
    reply_parameters: { message_id: ctx.message.message_id },
    reply_markup: keyboard,
  });

  // Note: Auto-deletion in 15 minutes scheduled via delayed job runner
}
