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
      const text = String(msg.text || '');
      const m = text.match(/^\/start\s+listing_([0-9a-f-]{36})$/i);
      const url = m ? `${APP_URL}?listing=${m[1]}` : APP_URL;
      const rentAdd = { text: '🏠 Ijara berish', web_app: { url: `${APP_URL}?go=rent_add` }, style: 'success' };
      const rentBrowse = { text: "🔎 Ijara ko'rish", web_app: { url: `${APP_URL}?go=rent` }, style: 'primary' };
      // Reklama deep link'lari: ?start=rental_add | rental — bitta bosishda kerakli bo'limga
      if (/^\/start\s+rental(_add)?$/i.test(text)) {
        const add = /rental_add$/i.test(text);
        await tgCall('sendMessage', {
          chat_id: msg.chat.id,
          text: add
            ? "<b>🏠 Uyingizni ijaraga qo'ying</b>\n\nRasm, narx va mahallani kiriting — 1 daqiqa. Bepul."
            : "<b>🔎 Olmaliqda ijara uy toping</b>\n\nKvartira, hovli uy, xona — mahalla, narx va xona soni bo'yicha.",
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[add ? rentAdd : rentBrowse], [add ? rentBrowse : rentAdd]] },
        });
        return { ok: true };
      }
      await tgCall('sendMessage', {
        chat_id: msg.chat.id,
        text:
          `Assalomu alaykum${name}! 👋\n\n` +
          `<b>Kim bor? — Olmaliq</b> ilovasida shahardagi ishonchli ustalar, do'konlar, idoralar, transport va arendani topasiz.\n\n` +
          (m ? `Sizga ulashilgan ma'lumotni ochish uchun pastdagi tugmani bosing 👇` : `🏠 <b>Uy ijaraga berasizmi yoki uy qidiryapsizmi?</b> Pastdagi tugmani bosing 👇`),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: m
            ? [[{ text: '📱 Ilovani ochish', web_app: { url }, style: 'primary' }]]
            : [[rentAdd, rentBrowse], [{ text: '📱 Ilovani ochish', web_app: { url }, style: 'primary' }]],
        },
      });
    }
    return { ok: true };
  });
}
