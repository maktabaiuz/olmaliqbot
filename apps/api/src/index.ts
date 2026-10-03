import { publicRoutes } from './routes/publicRoutes';
import { userBotWebhook } from './routes/userBotWebhook';
import { adminModeration } from './routes/adminModeration';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import crypto from 'crypto';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import fs from 'fs';
import { adminRoutes } from './routes/adminRoutes';
import { moderatorRoutes } from './routes/moderatorRoutes';
import { UPLOADS_DIR } from './uploadsPath';
import { db } from '@kimbor/db';

dotenv.config({ path: '../../.env' });

const fastify = Fastify({ logger: true });

// Admin panelidan yuklangan yozuv rasmlari (masalan "uy arendaga" e'lonlari)
// shu papkaga saqlanadi — docker-compose'da named volume orqali qayta
// build/restart'lardan omon qoladi.
fs.mkdirSync(`${UPLOADS_DIR}/listings`, { recursive: true });

async function main() {
  // Faqat o'z domenimizdan (2026-10-03 xavfsizlik): avval istalgan sayt cookie bilan so'rov yubora olardi.
  const ALLOWED_ORIGINS = new Set(['https://olmaliq.online', 'https://www.olmaliq.online']);
  await fastify.register(cors, {
    origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.has(origin) || (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))),
    credentials: true,
  });
  // IP bo'yicha umumiy cheklov — ko'p soxta akkaunt bilan bazani ko'chirib
  // olish va login'ni buzishga urinishdan himoya.
  const ipHits = new Map<string, { n: number; reset: number }>();
  fastify.addHook('onRequest', async (req, reply) => {
    const url = req.url;
    const strict = url.startsWith('/api/auth') || url.includes('/login');
    if (!url.startsWith('/api/public') && !strict) return;
    const ip = String(req.headers['x-forwarded-for'] || req.ip).split(',')[0].trim();
    const key = `${strict ? 'a' : 'p'}:${ip}`;
    const now = Date.now();
    const h = ipHits.get(key);
    if (!h || h.reset < now) ipHits.set(key, { n: 1, reset: now + 60_000 });
    else if (++h.n > (strict ? 20 : 240)) return reply.code(429).send({ success: false, message: "Juda ko'p so'rov, bir daqiqadan keyin urinib ko'ring" });
    if (ipHits.size > 50_000) ipHits.clear();
  });
  await fastify.register(cookie);
  // MUHIM (2026-09, standalone web-login): saytdan (Telegram tashqarisida)
  // kirish uchun sessiya cookie'sini imzolash/tekshirish shu kalit bilan
  // qilinadi.
  //
  // MUHIM TUZATISH (2026-09, real xato bilan tasdiqlangan): avval bu kalit
  // .env'da sozlanmasa HAR SAFAR qayta tasodifiy generatsiya qilinardi —
  // ya'ni HAR BIR deploy (bu sessiyada ko'plab bo'lgan) admin panelning
  // BARCHA saytdan-kirish sessiyalarini bekor qilardi, foydalanuvchi
  // "Autentifikatsiya ma'lumotlari talab qilinadi" xatosiga duch kelardi —
  // garchi u to'g'ri kirgan bo'lsa ham. Endi: agar .env'da SESSION_SECRET
  // yo'q bo'lsa, kalit BAZADA (AppSetting, "session_secret" kaliti) BIR
  // MARTA generatsiya qilinib saqlanadi va keyingi har bir ishga
  // tushirishda O'SHA BIR XIL kalit qayta o'qiladi — deploy/restart endi
  // sessiyalarni bekor qilmaydi, hatto .env'ga hech narsa qo'shilmasa ham.
  let sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    const SESSION_SECRET_KEY = 'session_secret';
    const existing = await db.appSetting.findUnique({ where: { key: SESSION_SECRET_KEY } });
    if (existing?.value) {
      sessionSecret = existing.value;
    } else {
      sessionSecret = crypto.randomBytes(32).toString('hex');
      await db.appSetting.upsert({
        where: { key: SESSION_SECRET_KEY },
        update: { value: sessionSecret },
        create: { key: SESSION_SECRET_KEY, value: sessionSecret },
      });
      fastify.log.warn('SESSION_SECRET .env da sozlanmagan — bazada yangi doimiy kalit yaratildi (endi deploy/restart sessiyalarni bekor qilmaydi).');
    }
  }
  await fastify.register(jwt, { secret: sessionSecret });
  await fastify.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB, bitta rasm har bir so'rovda
  });
  await fastify.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/api/uploads/',
  });
  await fastify.register(adminRoutes, { prefix: '/api' });
  await fastify.register(moderatorRoutes, { prefix: '/api' });
  // Foydalanuvchi ilovasi — admin API'dan alohida (2026-10).
  await fastify.register(publicRoutes, { prefix: '/api' });
  await fastify.register(userBotWebhook, { prefix: '/api' });
  await fastify.register(adminModeration, { prefix: '/api' });

  fastify.get('/health', async () => {
    return { status: 'ok', service: 'kimbor-api', timestamp: new Date().toISOString() };
  });

  fastify.get('/api/health', async () => {
    return { status: 'ok', service: 'kimbor-api', timestamp: new Date().toISOString() };
  });

  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    console.log(`⚡ API server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
