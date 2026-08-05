import { Bot, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import { db } from '@kimbor/db';
import { handleGroupMessage } from './handlers/groupHandler';
import { handleDirectMessage } from './handlers/directHandler';

dotenv.config({ path: '../../.env' });

const token = process.env.BOT_TOKEN || '8942221158:AAHV4cNIKA_b37jGwE4AXvaWyquTEco6UfU';

console.log('🤖 "Kim bor?" Telegram Boti ishga tushmoqda...');

async function startBot() {
  // Fetch default Olmaliq city from DB
  let olmaliqCity = await db.city.findFirst({
    where: { slug: 'olmaliq' },
  });

  if (!olmaliqCity) {
    olmaliqCity = await db.city.create({
      data: {
        name: 'Olmaliq',
        slug: 'olmaliq',
        planType: 'ASOSCHI',
        isActive: true,
      },
    });
  }

  const cityId = olmaliqCity.id;
  const bot = new Bot(token);

  // 1. /start command
  bot.command('start', async (ctx) => {
    const welcomeText = `Assalomu alaykum! "Kim bor?" — Shahar Ma'lumotnomasi Botiga xush kelibsiz! 🚀\n\nMen shahringizdagi ishonchli usta va xizmat ko'rsatuvchilarni topishga yordam beraman.\n\nSiz menga erkin uslubda savol berishingiz mumkin:\n• "karzinka oldida gazavik bormi?"\n• "santexnik kerak 3-mavze"\n• "bahromni nomeri nechi?"\n\nSavolingizni yozib yuboring! 👇`;

    const keyboard = new InlineKeyboard().url(
      '🌐 Web App Paneli',
      process.env.WEBAPP_URL || 'http://localhost:3000'
    );

    await ctx.reply(welcomeText, { reply_markup: keyboard });
  });

  // 2. Callback query handler (Baholash, Shikoyat, Hudud tanlash)
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('rate_')) {
      await ctx.answerCallbackQuery({ text: "⭐ Rahmat! Bahoyingiz qabul qilindi." });
    } else if (data.startsWith('report_')) {
      await ctx.answerCallbackQuery({ text: "⚠️ Shikoyat moderatorlarga yuborildi." });
    } else if (data.startsWith('area_')) {
      await ctx.answerCallbackQuery({ text: "Hudud tanlandi, qidirilmoqda..." });
      await ctx.reply("Qidirilmoqda... Tez orada natija yuboriladi.");
    } else {
      await ctx.answerCallbackQuery();
    }
  });

  // 3. Message routing (Group vs Direct Chat)
  bot.on('message:text', async (ctx) => {
    const chatType = ctx.chat.type;

    if (chatType === 'private') {
      await handleDirectMessage(ctx, cityId);
    } else if (chatType === 'group' || chatType === 'supergroup') {
      await handleGroupMessage(ctx, cityId);
    }
  });

  // Global Error Handler
  bot.catch((err) => {
    console.error('❌ Bot error:', err);
  });

  await bot.start({
    onStart(botInfo) {
      console.log(`======================================================`);
      console.log(`🚀 BOT MUVAFFAQIYATLI ISHGA TUSHDI!`);
      console.log(`🤖 Bot nomi: @${botInfo.username}`);
      console.log(`ID: ${botInfo.id}`);
      console.log(`Shahar: ${olmaliqCity?.name} (${cityId})`);
      console.log(`======================================================`);
    },
  });
}

startBot().catch((err) => {
  console.error('❌ Failed to start Telegram Bot:', err);
});
