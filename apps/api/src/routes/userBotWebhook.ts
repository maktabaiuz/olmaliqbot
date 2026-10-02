import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

/**
 * Foydalanuvchi ilovasi boti (USER_BOT_TOKEN) uchun minimal webhook
 * (2026-10). Bot faqat ilovaga eshik: /start (va istalgan xabar) ga
 * "Ilovani ochish" tugmasi bilan javob beradi. Telegram'dan kelganini
 * secret_token sarlavhasi bilan tekshiramiz.
 */
const APP_URL = 'https://olmaliq.online/app/';

export function userBotSecret(): string {
  const token = process.env.USER_BOT_TOKEN || '';
  return crypto.createHash('sha256').update(`userbot:${token}`).digest('hex').slice(0, 48);
}

// Webhook, menyu tugmasi, nom va tavsif bir marta Telegram API orqali
// sozlangan (2026-10-02); secret_token = userBotSecret().
async function tgCall(method: string, body: unknown) {
  const token = process.env.USER_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function userBotWebhook(fastify: FastifyInstance) {
  fastify.post('/userbot/webhook', async (req: any, reply) => {
    if (!process.env.USER_BOT_TOKEN || req.headers['x-telegram-bot-api-secret-token'] !== userBotSecret()) {
      return reply.code(401).send();
    }
    const msg = req.body?.message;
    if (msg?.chat?.type === 'private') {
      const name = msg.from?.first_name ? `, ${msg.from.first_name}` : '';
      // Ulashilgan havola: "/start listing_<id>" → ilova o'sha sahifada ochiladi.
      const m = String(msg.text || '').match(/^\/start\s+listing_([0-9a-f-]{36})$/i);
      const url = m ? `${APP_URL}?listing=${m[1]}` : APP_URL;
      await tgCall('sendMessage', {
        chat_id: msg.chat.id,
        text:
          `Assalomu alaykum${name}! 👋\n\n` +
          `<b>Kim bor? — Olmaliq</b> ilovasida shahardagi ishonchli ustalar, do'konlar, idoralar, transport va arendani topasiz.\n\n` +
          (m ? `Sizga ulashilgan ma'lumotni ochish uchun pastdagi tugmani bosing 👇` : `Pastdagi tugmani bosing 👇`),
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '📱 Ilovani ochish', web_app: { url }, style: 'primary' }]] },
      });
    }
    return { ok: true };
  });
}
