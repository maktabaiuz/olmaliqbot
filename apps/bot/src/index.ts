import { Bot, webhookCallback } from 'grammy';
import http from 'http';
import dotenv from 'dotenv';
import { db } from '@kimbor/db';
import { handleGroupMessage } from './handlers/groupHandler';
import { handleDirectMessage, handleDirectCallbacks } from './handlers/directHandler';
import { startDeletionWorker } from './queue/deleteQueue';

dotenv.config({ path: '../../.env' });


const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN muhit o\'zgaruvchisi berilmagan. Bot ishga tushmaydi.');
  process.exit(1);
}

console.log('🤖 "Kim bor?" Telegram Boti ishga tushmoqda...');

async function startBot() {
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
  // token is guaranteed non-undefined: process.exit(1) is called above if missing
  const bot = new Bot(token!);

  // Bot qaysi guruhlarda ishlashini kuzatib boradi (Admin panel > Yana >
  // Guruhlar bo'limida ko'rinadi). Jarayon davomida bir guruhni qayta-qayta
  // yozib turmaslik uchun xotirada saqlanadi.
  const knownGroupChatIds = new Set<number>();
  async function recordGroupIfNew(chatId: number, title: string | null | undefined) {
    if (knownGroupChatIds.has(chatId)) return;
    knownGroupChatIds.add(chatId);
    try {
      await db.cityGroup.upsert({
        where: { chatId: BigInt(chatId) },
        update: { title: title || null },
        create: { cityId, chatId: BigInt(chatId), title: title || null },
      });
    } catch (err) {
      console.error('Failed to record city group:', err);
    }
  }

  // GrammY Outbound API message logging middleware
  bot.api.config.use((prev, method, payload, signal) => {
    if (method === 'sendMessage' && payload && 'chat_id' in payload && 'text' in payload) {
      const chatId = (payload as any).chat_id;
      const text = (payload as any).text;
      const tgUserId = BigInt(chatId);
      if (tgUserId > BigInt(0)) {
        db.chatMessage.create({
          data: {
            telegramUserId: tgUserId,
            senderType: 'BOT_SEARCH',
            text: text,
          },
        }).catch(err => console.error('Failed to log outgoing bot message:', err));
      }
    }
    return prev(method, payload, signal);
  });

  // GrammY Inbound message logging and user upsert middleware
  // Analitika yozuvlari javobni sekinlashtirmasligi uchun kutilmaydi (fire-and-forget)
  bot.use((ctx, next) => {
    if (ctx.chat?.type === 'private' && ctx.from) {
      const tgUserId = BigInt(ctx.from.id);

      db.user.upsert({
        where: { telegramId: tgUserId },
        update: {
          firstName: ctx.from.first_name || null,
          lastName: ctx.from.last_name || null,
          username: ctx.from.username || null,
        },
        create: {
          telegramId: tgUserId,
          firstName: ctx.from.first_name || null,
          lastName: ctx.from.last_name || null,
          username: ctx.from.username || null,
          role: 'USER',
        },
      }).catch(err => console.error('Failed to upsert user:', err));

      if (ctx.message?.text) {
        db.chatMessage.create({
          data: {
            telegramUserId: tgUserId,
            senderType: 'USER',
            text: ctx.message.text.trim(),
          },
        }).catch(err => console.error('Failed to log inbound user message:', err));
      }
    }
    return next();
  });

  // Start BullMQ deletion worker — persists across restarts via Redis
  startDeletionWorker(async (chatId, messageId) => {
    await bot.api.deleteMessage(chatId, messageId);
  });

  console.log('✅ BullMQ deletion worker started.');

  // Set Chat Menu Button for Telegram Mini App.
  // Manzilga "?v=<ishga tushish vaqti>" qo'shiladi — Telegram WebView har bir
  // deploydan keyin sahifani yangi (keshlanmagan) manzil sifatida ochadi,
  // aks holda eski dizayn ko'rsatilib qolishi mumkin edi (URL o'zgarmasa,
  // Telegram avvalgi keshlangan WebView'ni qayta ishlatishi mumkin).
  const webappUrl = `${process.env.WEBAPP_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}`}?v=${Date.now()}`;
  try {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: '🛍 Kim bor? ilovasi',
        web_app: { url: webappUrl },
      },
    });
    console.log(`✅ Menu Button set to: ${webappUrl}`);
  } catch (err) {
    console.error('⚠️ Failed to set menu button:', err);
  }

  // 1. /start command in private chat
  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      await handleDirectMessage(ctx, cityId);
    }
  });

  // 2. Callback query handler
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('rate_')) {
      await ctx.answerCallbackQuery({ text: "⭐ Rahmat! Bahoyingiz qabul qilindi." });
    } else if (data.startsWith('report_')) {
      await ctx.answerCallbackQuery({ text: "⚠️ Shikoyat moderatorlarga yuborildi." });
      try {
        const listingId = data.replace('report_', '');
        const listing = await db.listing.findUnique({
          where: { id: listingId },
          include: { category: true }
        });
        const listingInfo = listing 
          ? `"${listing.name}" (${listing.phone}) - Kategoriya: ${listing.category?.name || 'Noma\'lum'}`
          : `ID: ${listingId}`;
        const complaintText = `⚠️ Shikoyat: Foydalanuvchi ${listingInfo} ustidan shikoyat qildi.`;
        
        await db.chatMessage.create({
          data: {
            telegramUserId: BigInt(ctx.from.id),
            senderType: 'USER',
            text: complaintText,
            isComplaint: true,
          },
        });
      } catch (err) {
        console.error('Failed to log complaint ChatMessage:', err);
      }
    } else {
      await handleDirectCallbacks(ctx, cityId);
    }
  });

  // 3. Bot joined new group intro message
  bot.on('message:new_chat_members', async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const botInfo = await ctx.api.getMe();
    const isBotAdded = newMembers.some((m) => m.id === botInfo.id);

    if (isBotAdded) {
      await recordGroupIfNew(ctx.chat.id, ctx.chat.title);
      const introText = `Assalomu alaykum! Men "Kim bor?" — ${olmaliqCity?.name} shahri bo'yicha yordamchi botman. 🚀\n\nGuruhda savollaringizni bemalol berishingiz mumkin:\n• *"karzinka oldida gazavik bormi?"*\n• *"santexnik kerak 3-mavze"*`;
      await ctx.reply(introText);
    }
  });

  // 3b. Botning guruh/kanaldagi a'zolik holati o'zgarishi (qo'shildi, admin
  // qilindi, chiqarib yuborildi) — "Guruhlar" ro'yxatini har doim aniq tutib
  // turadi. Har qanday guruh/kanalga bot admin qilib qo'shilsa, qo'shimcha
  // sozlashsiz avtomatik ro'yxatga tushadi va ishlay boshlaydi.
  bot.on('my_chat_member', async (ctx) => {
    const chat = ctx.update.my_chat_member.chat;
    if (chat.type !== 'group' && chat.type !== 'supergroup' && chat.type !== 'channel') return;

    const newStatus = ctx.update.my_chat_member.new_chat_member.status;
    if (newStatus === 'member' || newStatus === 'administrator') {
      await recordGroupIfNew(chat.id, 'title' in chat ? chat.title : null);
    } else if (newStatus === 'left' || newStatus === 'kicked') {
      knownGroupChatIds.delete(chat.id);
      await db.cityGroup.deleteMany({ where: { chatId: BigInt(chat.id) } }).catch((err) =>
        console.error('Failed to remove city group:', err)
      );
    }
  });

  // 4. Message routing
  bot.on('message:text', async (ctx) => {
    const chatType = ctx.chat.type;

    if (chatType === 'private') {
      await handleDirectMessage(ctx, cityId);
    } else if (chatType === 'group' || chatType === 'supergroup') {
      // Eski (funksiya joriy etilishidan oldin qo'shilgan) guruhlarni ham
      // orqaga qaytib "to'ldiradi" — birinchi xabar kelganda ro'yxatga tushadi
      recordGroupIfNew(ctx.chat.id, ctx.chat.title).catch(() => {});
      await handleGroupMessage(ctx, cityId);
    }
  });

  // Global Error Handler
  bot.catch((err) => {
    console.error('❌ Bot error:', err);
  });

  const useWebhook = process.env.USE_WEBHOOK === 'true' || process.env.WEBHOOK_URL !== undefined;

  if (useWebhook) {
    const webhookUrl = process.env.WEBHOOK_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}/webhook`;
    await bot.api.setWebhook(webhookUrl);
    console.log(`✅ Webhook set to: ${webhookUrl}`);

    const handleUpdate = webhookCallback(bot, 'http');
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        handleUpdate(req, res);
      } else {
        res.statusCode = 200;
        res.end('OK');
      }
    });

    server.listen(3001, () => {
      console.log(`======================================================`);
      console.log(`🚀 BOT WEBHOOK MODE DA ISHGA TUSHDI! (Port: 3001)`);
      console.log(`======================================================`);
    });
  } else {
    await bot.start({
      onStart(botInfo) {
        console.log(`======================================================`);
        console.log(`🚀 BOT POLLING MODE DA ISHGA TUSHDI!`);
        console.log(`🤖 Bot nomi: @${botInfo.username}`);
        console.log(`ID: ${botInfo.id}`);
        console.log(`======================================================`);
      },
    });
  }
}

startBot().catch((err) => {
  console.error('❌ Failed to start Telegram Bot:', err);
});
