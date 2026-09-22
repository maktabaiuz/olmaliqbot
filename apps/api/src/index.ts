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
  await fastify.register(cors, { origin: true, credentials: true });
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
