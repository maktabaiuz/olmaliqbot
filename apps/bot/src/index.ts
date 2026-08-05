import { Bot, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import { db } from '@kimbor/db';
import { handleGroupMessage } from './handlers/groupHandler';
import { handleDirectMessage, handleDirectCallbacks } from './handlers/directHandler';

dotenv.config({ path: '../../.env' });

const token = process.env.BOT_TOKEN || '8603273053:AAFazZJBTKPnZZGsvIEpwIAhJSejsUQQSSU';

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

  // 1. /start command in private chat
  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      await handleDirectMessage(ctx, cityId);
    }
  });

  // 2. Callback query handler (City selection, Quick search, Candidate & Franchise actions)
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('rate_')) {
      await ctx.answerCallbackQuery({ text: "⭐ Rahmat! Bahoyingiz qabul qilindi." });
    } else if (data.startsWith('report_')) {
      await ctx.answerCallbackQuery({ text: "⚠️ Shikoyat moderatorlarga yuborildi." });
    } else {
      await handleDirectCallbacks(ctx, cityId);
    }
  });

  // 3. Bot joined new group intro message (TZ 10.4)
  bot.on('message:new_chat_members', async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const botInfo = await ctx.api.getMe();
    const isBotAdded = newMembers.some((m) => m.id === botInfo.id);

    if (isBotAdded) {
      const introText = `Assalomu alaykum! Men "Kim bor?" — ${olmaliqCity?.name} shahri bo'yicha yordamchi botman. 🚀\n\nGuruhda savollaringizni bemalol berishingiz mumkin:\n• *"karzinka oldida gazavik bormi?"*\n• *"santexnik kerak 3-mavze"*`;
      await ctx.reply(introText);
    }
  });

  // 4. Message routing (Group vs Direct Chat)
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
