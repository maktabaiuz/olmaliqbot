import { Context, InlineKeyboard } from 'grammy';
import { classifyQuery } from '../filter/aiClassifier';
import { searchListings } from '@kimbor/core';
import { db } from '@kimbor/db';

export async function handleDirectMessage(ctx: Context, cityId: string) {
  const messageText = ctx.message?.text;
  if (!messageText || !ctx.from) return;

  const userId = BigInt(ctx.from.id);

  // 1. Check 20 queries/day limit per user
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const queryCountToday = await db.queryLog.count({
    where: {
      telegramUserId: userId,
      createdAt: { gte: todayStart },
    },
  });

  if (queryCountToday >= 20) {
    await ctx.reply("🚫 Bugungi 20 ta savol limitingiz tugadi. Ertaga qayta urinib ko'ring.");
    return;
  }

  // 2. Classify intent
  const classification = await classifyQuery(messageText);

  // 3. If landmark missing, present clarification wizard
  if (!classification.landmark && classification.category) {
    const keyboard = new InlineKeyboard()
      .text('Karzinka', `area_korzinka_${classification.category}`)
      .text('3-mavze', `area_3mavze_${classification.category}`)
      .row()
      .text("Farqi yo'q", `area_any_${classification.category}`);

    await ctx.reply('Qaysi hududda kerak edi?', { reply_markup: keyboard });
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
    // Log missing request
    await db.queryLog.create({
      data: {
        cityId,
        telegramUserId: userId,
        rawMessage: messageText,
        intent: classification.intent,
        categoryName: classification.category,
        landmarkName: classification.landmark,
        isResolved: false,
      },
    });

    await ctx.reply("Bu bo'yicha hozircha ma'lumot yo'q. Tez orada qo'shamiz 🙌");
    return;
  }

  // Lichkada xabar o'chmaydi (Direct messages do not auto-delete)
  await ctx.reply(searchResult.formattedText);
}
