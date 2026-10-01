import { Bot } from 'grammy';
import http from 'http';
import dotenv from 'dotenv';
import { db } from '@kimbor/db';
import { handleGroupMessage } from './handlers/groupHandler';
import { handleDirectMessage, handleDirectCallbacks, sendStartWelcome } from './handlers/directHandler';
import { getMissingChannels, buildSubscriptionGate } from './subscription/requiredChannels';
import { initGateForNewMember, enforceInviteGate, creditInviteIfTracked, announceInviteUnlocked } from './moderation/inviteGate';
import type { Context } from 'grammy';
import { startDeletionWorker, redisConnection } from './queue/deleteQueue';
import { scheduleBroadcastTicks, startBroadcastWorker } from './queue/broadcastQueue';

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

      // MUHIM (2026-09 topilgan jiddiy xato): bu yerda `cityId` HECH QACHON
      // yozilmagan edi (na create'da, na update'da) — natijada botga
      // /start bosgan HAQIQIY foydalanuvchilarning katta qismi (production'da
      // tasdiqlangan: 55 tadan 47 tasi, ~85%) `cityId: null` bilan
      // saqlanib qolgan edi. Bu esa ularni shahar bo'yicha filtrlaydigan
      // BARCHA admin so'rovlariga (masalan "Userlar" soni) ko'rinmas
      // qilib qo'ygan edi. Yagona shahar (Olmaliq) shu jarayonning
      // boshida allaqachon aniqlangan — shuni yozamiz.
      db.user.upsert({
        where: { telegramId: tgUserId },
        update: {
          firstName: ctx.from.first_name || null,
          lastName: ctx.from.last_name || null,
          username: ctx.from.username || null,
          cityId,
        },
        create: {
          telegramId: tgUserId,
          firstName: ctx.from.first_name || null,
          lastName: ctx.from.last_name || null,
          username: ctx.from.username || null,
          role: 'USER',
          cityId,
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

  // Rejalashtirilgan ommaviy xabarlar (Habar yuborish) — har 1 daqiqada
  // "vaqti kelgan" postlarni tekshirib, ulangan guruh/kanallarga yuboradi.
  await scheduleBroadcastTicks();
  startBroadcastWorker(bot);
  console.log('✅ Broadcast worker started.');

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
  // Majburiy obuna (2026-10): shaxsiy chatda har bir xabar va /start
  // oldidan tekshiriladi. Obuna bo'lmagan foydalanuvchiga kanallar tugmasi
  // va "Obuna bo'ldim" tugmasi chiqadi.
  const passesSubscriptionGate = async (ctx: Context): Promise<boolean> => {
    if (ctx.chat?.type !== 'private' || !ctx.from) return true;
    const missing = await getMissingChannels(ctx.api, ctx.from.id);
    if (missing.length === 0) return true;
    const gate = buildSubscriptionGate(missing);
    await ctx.reply(gate.text, { parse_mode: 'HTML', reply_markup: gate.keyboard });
    return false;
  };

  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      if (!(await passesSubscriptionGate(ctx))) return;
      await handleDirectMessage(ctx, cityId);
    }
  });

  // 2. Callback query handler
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data === 'sub_check') {
      const missing = await getMissingChannels(ctx.api, ctx.from.id);
      if (missing.length > 0) {
        await ctx.answerCallbackQuery({ text: "Hali hamma kanalga obuna bo'lmagansiz 🙏", show_alert: true });
        return;
      }
      await ctx.answerCallbackQuery({ text: 'Rahmat! ✅' });
      await ctx.deleteMessage().catch(() => {});
      await sendStartWelcome(ctx);
      return;
    }

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

    // 2026-09-28, "Guruhlar" chuqur tahlili — "yangi a'zo -> birinchi
    // so'rov" konversiyasini hisoblash uchun (bot qanchalik "topilyapti"),
    // ODDIY (bot o'zi emas) yangi a'zolar ham qachon qo'shilgani bilan
    // qayd etiladi.
    const realNewMembers = newMembers.filter((m) => m.id !== botInfo.id && !m.is_bot);
    if (realNewMembers.length > 0) {
      const chatId = BigInt(ctx.chat.id);
      db.groupMemberJoinEvent
        .createMany({
          data: realNewMembers.map((m) => ({ chatId, telegramUserId: BigInt(m.id) })),
        })
        .catch((err) => console.error('Failed to log GroupMemberJoinEvent:', err));

      // "Majburiy taklif" (2026-10) — agar shu guruhda yoqilgan bo'lsa,
      // har bir YANGI a'zoni "kutib turuvchi" deb belgilaydi (eski
      // a'zolarga tegmaydi, chunki ular uchun bu hodisa umuman kelmaydi).
      for (const m of realNewMembers) {
        initGateForNewMember(ctx.chat.id, m.id).catch((err) =>
          console.error('initGateForNewMember xatosi:', err)
        );
      }
    }
  });

  // 3c. "Majburiy taklif" uchun: kim qaysi shaxsiy taklif havolasi orqali
  // kirganini bildiradi (FAQAT bot shu guruhda ADMIN bo'lsa keladi).
  // Umumiy guruh havolasi orqali kirilgan bo'lsa (bizning tizim
  // yaratmagan havola) — hech narsa bo'lmaydi, jim o'tkazib yuboriladi.
  bot.on('chat_member', async (ctx) => {
    const update = ctx.chatMember;
    if (!update) return;
    const chat = update.chat;
    if (chat.type !== 'group' && chat.type !== 'supergroup') return;

    const prevStatus = update.old_chat_member.status;
    const newStatus = update.new_chat_member.status;
    const justJoined =
      (prevStatus === 'left' || prevStatus === 'kicked') &&
      (newStatus === 'member' || newStatus === 'administrator' || newStatus === 'restricted');
    if (!justJoined || update.new_chat_member.user.is_bot) return;

    const usedLink = update.invite_link?.invite_link;
    try {
      const result = await creditInviteIfTracked(chat.id, usedLink);
      if (result) {
        await announceInviteUnlocked(ctx, chat.id, result.newlyVerifiedUserId);
      }
    } catch (err) {
      console.error('creditInviteIfTracked xatosi:', err);
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
      if (!(await passesSubscriptionGate(ctx))) return;
      await handleDirectMessage(ctx, cityId);
    } else if (chatType === 'group' || chatType === 'supergroup') {
      // Eski (funksiya joriy etilishidan oldin qo'shilgan) guruhlarni ham
      // orqaga qaytib "to'ldiradi" — birinchi xabar kelganda ro'yxatga tushadi
      recordGroupIfNew(ctx.chat.id, ctx.chat.title).catch(() => {});
      // "Majburiy taklif" — agar shu odam hali yetarli odam taklif
      // qilmagan bo'lsa, xabar shu yerda o'chirilib, eslatma bilan
      // to'xtatiladi (handleGroupMessage'ga UMUMAN yetib bormaydi).
      if (await enforceInviteGate(ctx)) return;
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
    // MUHIM (2026-09 topilgan JIDDIY xato): `allowed_updates` ko'rsatilmasa,
    // Telegram OLDIN o'rnatilgan cheklovni saqlab qoladi (o'z hujjatida
    // aniq yozilgan: "If not specified, the previous setting will be
    // used"). Bazada nima uchundir faqat ["message", "edited_message",
    // "channel_post", "edited_channel_post"] ro'yxati qolib ketgan edi —
    // "callback_query" ro'yxatda YO'Q edi! Natijada Telegram tugma
    // bosilganda ("Yana ko'rish", yulduzcha baho, shikoyat) hodisani
    // BOTGA UMUMAN YUBORMASDI — bot hech qanday xato bermas, chunki
    // so'rovning o'zi hech qachon kelmasdi. Endi HAR safar ishga
    // tushganda TO'LIQ ro'yxat ANIQ ko'rsatiladi, shunday qilib bu holat
    // qayta yuzaga kelmaydi.
    await bot.api.setWebhook(webhookUrl, {
      allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'callback_query', 'my_chat_member', 'chat_member'],
    });
    console.log(`✅ Webhook set to: ${webhookUrl}`);

    // MUHIM: avval webhookCallback() bot.init()ni o'zi ichida chaqirardi.
    // Endi bot.handleUpdate()ni qo'lda chaqirganimiz uchun, buni ANIQ
    // o'zimiz qilishimiz kerak — aks holda HAR BIR update "Bot not
    // initialized!" xatosi bilan muvaffaqiyatsiz bo'ladi.
    await bot.init();

    // MUHIM (2026-09 topilgan xato): standart webhookCallback() Telegram'ga
    // JAVOBNI faqat butun xabar qayta ishlanib bo'lgach (Claude API chaqiruvi,
    // qidiruv, DB yozuvlari — bir necha soniya) yuborar edi. Agar bu vaqt
    // Telegram'ning ichki kutish chegarasidan oshsa, Telegram "javob kelmadi"
    // deb XUDDI SHU xabarni QAYTA yuboradi — natijada har bir xabar deyarli
    // IKKI MARTA qayta ishlanardi (production QueryLog'da amalda deyarli
    // barcha yozuvlar juft-juft, bir-biridan ~20-40 msda paydo bo'lganini
    // tasdiqladik). Bu ikki barobar AI xarajati va ba'zan foydalanuvchiga
    // BIR XIL javobni ikki marta ko'rsatish xavfini keltirib chiqarardi.
    //
    // Tuzatish: Telegram'ga DARHOL ("OK") javob beriladi, xabarning o'zi
    // FONDA (async) qayta ishlanadi — Telegram hech qachon "javob kelmadi"
    // deb qayta yubormaydi.
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          res.statusCode = 200;
          res.end('OK');
          try {
            const update = JSON.parse(body);

            // Qo'shimcha himoya qatlami: Telegram'ning o'z update_id'si
            // orqali takroriy yetkazishni butunlay to'sib qo'yamiz — hatto
            // yuqoridagi "darhol javob berish" tuzatishidan keyin ham,
            // tarmoq darajasidagi (Telegram infratuzilmasi) takroriy
            // yuborish nazariy jihatdan mumkin. Redis'da 5 daqiqaga
            // "ko'rilgan" deb belgilanadi (SET NX — faqat hali yo'q bo'lsa
            // yoziladi), qayta ishga tushirishlarga ham chidamli.
            const updateId = update?.update_id;
            if (updateId !== undefined) {
              const wasNew = await redisConnection.set(`kimbor:webhook:seen:${updateId}`, '1', 'EX', 300, 'NX');
              if (!wasNew) {
                console.warn(`⚠️ Takroriy update_id (${updateId}) — o'tkazib yuborildi`);
                return;
              }
            }

            bot.handleUpdate(update).catch((err) => console.error('❌ Update qayta ishlashda xato:', err));
          } catch (err) {
            console.error('❌ Webhook body JSON parslanmadi:', err);
          }
        });
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

    // MUHIM (2026-09-27, real ishlab chiqarish uzilishi): bot 30+ soat
    // "ishlagandek" ko'rinib (konteyner Up, hech qanday xato/qulash yo'q,
    // Caddy loglarida bironta 5xx yo'q), lekin foydalanuvchilarga UMUMAN
    // javob bermay qolgan edi — Telegram tomonidan webhook TASHQARIDAN
    // (bizning kodimiz hech qachon deleteWebhook/setWebhook("") chaqirmaydi)
    // tozalanib qolgan, va bu HECH QANDAY xato/log qoldirmagan, shu sabab
    // hech kim buni darhol payqamagan. Endi bot davriy ravishda o'zining
    // webhook holatini tekshiradi va kerak bo'lsa avtomatik qayta tiklaydi —
    // shunda bunday uzilish soatlab emas, bir necha daqiqada tuzatiladi.
    const WEBHOOK_HEALTHCHECK_INTERVAL_MS = 5 * 60 * 1000;
    setInterval(async () => {
      try {
        const info = await bot.api.getWebhookInfo();
        if (info.url !== webhookUrl) {
          console.error(`⚠️ Webhook tashqaridan o'zgargan/tozalangan (kutilgan: ${webhookUrl}, hozirgi: "${info.url}") — qayta o'rnatilmoqda...`);
          await bot.api.setWebhook(webhookUrl, {
            allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'callback_query', 'my_chat_member', 'chat_member'],
          });
          console.log(`✅ Webhook avtomatik qayta tiklandi: ${webhookUrl}`);
        }
      } catch (err) {
        console.error('❌ Webhook health-check xatosi:', err);
      }
    }, WEBHOOK_HEALTHCHECK_INTERVAL_MS).unref();
  } else {
    await bot.start({
      // MUHIM: Telegram "chat_member" yangilanishlarini HATTO allowed_updates
      // umuman berilmagan ("hammasi") holatda ham avtomatik YUBORMAYDI — bu
      // alohida, aniq so'ralishi SHART bo'lgan yagona tur (rasmiy hujjatda
      // yozilgan). Shu sabab "Majburiy taklif" funksiyasi polling rejimida
      // ham ishlashi uchun bu yerda ham aniq ro'yxat beriladi.
      allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'callback_query', 'my_chat_member', 'chat_member'],
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
