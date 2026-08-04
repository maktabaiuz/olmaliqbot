"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDirectMessage = handleDirectMessage;
const grammy_1 = require("grammy");
const aiClassifier_1 = require("../filter/aiClassifier");
const core_1 = require("@kimbor/core");
const db_1 = require("@kimbor/db");
async function handleDirectMessage(ctx, cityId) {
    const messageText = ctx.message?.text;
    if (!messageText || !ctx.from)
        return;
    const userId = BigInt(ctx.from.id);
    // 1. Check 20 queries/day limit per user
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const queryCountToday = await db_1.db.queryLog.count({
        where: {
            telegramUserId: userId,
            createdAt: { gte: todayStart },
        },
    });
    if (queryCountToday >= 20) {
        await ctx.reply("🚫 Bugungi 20 ta savol limitingiz tugadi. Ertaga qayta urinib ko'ring.");
        return;
    }
    // 2. Classify query intent
    const classification = await (0, aiClassifier_1.classifyQuery)(messageText, cityId, userId);
    // 3. If landmark missing/ambiguous and category exists, present clarification wizard
    if (!classification.landmark && classification.category) {
        const keyboard = new grammy_1.InlineKeyboard()
            .text('Karzinka', `area_korzinka_${classification.category}`)
            .text('3-mavze', `area_3mavze_${classification.category}`)
            .row()
            .text("Farqi yo'q", `area_any_${classification.category}`);
        await ctx.reply('Qaysi hududda kerak edi?', { reply_markup: keyboard });
        return;
    }
    // 4. Search directory listings
    const searchResult = await (0, core_1.searchListings)({
        cityId,
        categoryName: classification.category,
        landmarkName: classification.landmark,
        limit: 1,
    });
    if (!searchResult) {
        // Log missing query
        await db_1.db.queryLog.create({
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
    const keyboard = new grammy_1.InlineKeyboard()
        .text('⭐ Baholash', `rate_${searchResult.listingId}`)
        .text('⚠️ Shikoyat', `report_${searchResult.listingId}`);
    await ctx.reply(searchResult.formattedText, { reply_markup: keyboard });
}
//# sourceMappingURL=directHandler.js.map