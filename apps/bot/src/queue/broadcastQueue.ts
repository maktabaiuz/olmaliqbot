/**
 * broadcastQueue.ts
 *
 * Admin panelidan yaratilgan rejalashtirilgan ommaviy xabarlarni
 * (BroadcastMessage) o'z vaqtida, o'z takrorlanish oralig'i bilan bot
 * ulangan tanlangan guruh/kanallarga yuboradi.
 *
 * BullMQ **repeatable job** orqali ishlaydi — har 1 daqiqada bitta "tick"
 * ishga tushadi (Redis'da saqlanadi, bot qayta ishga tushirilsa ham
 * jadval yo'qolmaydi), har safar bazadan "vaqti kelgan" (nextSendAt <=
 * hozir, isEnabled=true) postlarni topib yuboradi.
 *
 * Har bir (post x guruh) uchun oldingi yuborilgan xabar ESKI nusxasi
 * (agar bor bo'lsa) yangisi yuborilgach avtomatik o'chiriladi — shu bilan
 * guruh/kanalda har doim faqat ENG SO'NGGI nusxa ko'rinadi.
 */

import { Queue, Worker } from 'bullmq';
import { Bot } from 'grammy';
import { db } from '@kimbor/db';
import { buildSlideshowHtml } from '@kimbor/core';
import { redisConnection } from './deleteQueue';

const QUEUE_NAME = 'broadcast-tick';
const TICK_JOB_ID = 'broadcast-tick';
const TICK_INTERVAL_MS = 60_000;

const broadcastQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

/**
 * Takrorlanuvchi "tick" ishini ro'yxatdan o'tkazadi. Bot ishga tushganda
 * bir marta chaqiriladi — BullMQ bir xil `jobId` bilan qayta chaqirilsa
 * eskisini almashtiradi (dublikat jadval yaralmaydi).
 */
export async function scheduleBroadcastTicks(): Promise<void> {
  await broadcastQueue.add(
    'tick',
    {},
    {
      repeat: { every: TICK_INTERVAL_MS },
      jobId: TICK_JOB_ID,
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
}

/**
 * Worker'ni ishga tushiradi. Bot ishga tushganda bir marta chaqiriladi.
 */
export function startBroadcastWorker(bot: Bot): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      await processDueBroadcasts(bot);
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[broadcastQueue] Tick failed:`, err?.message);
  });

  return worker;
}

async function processDueBroadcasts(bot: Bot): Promise<void> {
  const due = await db.broadcastMessage.findMany({
    where: { isEnabled: true, nextSendAt: { lte: new Date() } },
  });
  if (due.length === 0) return;

  const publicBaseUrl = process.env.WEBAPP_URL || `https://${process.env.DOMAIN || 'olmaliq.online'}`;

  for (const broadcast of due) {
    await sendBroadcastToAllTargets(bot, broadcast, publicBaseUrl);
  }
}

// Telegram butun xabarni (matn + rasm) rad etadi, agar tugma URL'i
// yaroqsiz bo'lsa — "http://@username" kabi noto'g'ri havola tufayli
// haqiqiy xabar HAM yetib bormay qolgan edi (2026-09, ishlab chiqarishda
// tasdiqlangan xato). Shuning uchun URL avvaldan tekshiriladi — yaroqsiz
// bo'lsa, tugma butunlay QO'SHILMAYDI (xabarning o'zi baribir yetib
// boradi), sabab lastError'ga yoziladi.
function isValidButtonUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'tg:') && !!parsed.hostname;
  } catch {
    return false;
  }
}

async function sendBroadcastToAllTargets(
  bot: Bot,
  broadcast: {
    id: string;
    text: string;
    photoUrls: string[];
    targetChatIds: bigint[];
    repeatIntervalMinutes: number | null;
    linkUrl: string | null;
    linkLabel: string | null;
    linkButtonStyle: string | null;
  },
  publicBaseUrl: string
): Promise<void> {
  const slideshowHtml = buildSlideshowHtml(broadcast.photoUrls, publicBaseUrl);
  const errors: string[] = [];

  // Reklama/tashqi havola — berilgan bo'lsa, xabar ostida tugma sifatida
  // chiqadi (mavjud "Yana ko'rish"/kanal tugmalari bilan bir xil uslub).
  // Rang — Telegram Bot API'ning haqiqiy, cheklangan 3 ta qiymati:
  // "primary" (ko'k), "success" (yashil), "danger" (qizil).
  let replyMarkup:
    | { inline_keyboard: { text: string; url: string; style?: 'primary' | 'success' | 'danger' }[][] }
    | undefined;
  if (broadcast.linkUrl) {
    if (isValidButtonUrl(broadcast.linkUrl)) {
      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: broadcast.linkLabel || 'Havola',
              url: broadcast.linkUrl,
              ...(broadcast.linkButtonStyle ? { style: broadcast.linkButtonStyle as 'primary' | 'success' | 'danger' } : {}),
            },
          ],
        ],
      };
    } else {
      errors.push(`Havola noto'g'ri ("${broadcast.linkUrl}") — tugma qo'shilmadi, faqat matn yuborildi.`);
    }
  }

  for (const chatIdBig of broadcast.targetChatIds) {
    const chatId = Number(chatIdBig);
    try {
      let sentMessageId: number;
      if (slideshowHtml) {
        const richHtml = `${slideshowHtml}<br>${broadcast.text.replace(/\n/g, '<br>')}`;
        const sent = await bot.api.sendRichMessage(chatId, { html: richHtml }, { reply_markup: replyMarkup });
        sentMessageId = sent.message_id;
      } else {
        const sent = await bot.api.sendMessage(chatId, broadcast.text, { parse_mode: 'HTML', reply_markup: replyMarkup });
        sentMessageId = sent.message_id;
      }

      // Shu (post x guruh) uchun oldingi yuborilgan xabar bo'lsa — yangisi
      // muvaffaqiyatli ketgach, ESKISINI o'chiramiz.
      const prev = await db.broadcastSentMessage.findUnique({
        where: { broadcastId_chatId: { broadcastId: broadcast.id, chatId: chatIdBig } },
      });
      if (prev) {
        try {
          await bot.api.deleteMessage(chatId, prev.messageId);
        } catch {
          // Admin/foydalanuvchi allaqachon o'chirib yuborgan yoki juda eski — jim yutiladi
        }
      }

      await db.broadcastSentMessage.upsert({
        where: { broadcastId_chatId: { broadcastId: broadcast.id, chatId: chatIdBig } },
        create: { broadcastId: broadcast.id, chatId: chatIdBig, messageId: sentMessageId },
        update: { messageId: sentMessageId, sentAt: new Date() },
      });
    } catch (err: any) {
      // Bitta guruhga yuborish xatosi (masalan bot guruhdan chiqarilgan)
      // boshqa guruhlarga yuborishni to'xtatmasligi kerak.
      const reason = err?.description || err?.message || String(err);
      console.error(`[broadcastQueue] Failed to send broadcast ${broadcast.id} to chat ${chatId}:`, err);
      errors.push(`Chat ${chatId}: ${reason}`);
    }
  }

  // Keyingi yuborilish vaqtini hisoblash — takrorlanmaydigan (faqat bir
  // martalik) post bo'lsa, nextSendAt `null` qilinadi (endi hech qachon
  // qayta tanlanmaydi, lekin isEnabled o'zgarmaydi — admin ro'yxatida
  // "yuborilgan" holatda ko'rinib turadi).
  const nextSendAt = broadcast.repeatIntervalMinutes
    ? new Date(Date.now() + broadcast.repeatIntervalMinutes * 60_000)
    : null;

  await db.broadcastMessage.update({
    where: { id: broadcast.id },
    data: {
      nextSendAt,
      lastSentAt: new Date(),
      lastError: errors.length > 0 ? errors.join(' | ').slice(0, 500) : null,
    },
  });
}
