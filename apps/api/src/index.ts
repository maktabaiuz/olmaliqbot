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
  // qilinadi. SESSION_SECRET serverda sozlanmagan bo'lsa ham API
  // ishlashda davom etadi (xavfsizlik uchun EMAS, ishlab chiqishda
  // qulaylik uchun) — lekin bu holda har bir deploy/qayta ishga
  // tushirishda barcha web-sessiyalar bekor bo'ladi, shuning uchun
  // productionda SESSION_SECRET albatta .env'ga qo'yilishi kerak.
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  if (!process.env.SESSION_SECRET) {
    fastify.log.warn('SESSION_SECRET .env da sozlanmagan — vaqtinchalik tasodifiy kalit ishlatilmoqda, har deploy sessiyalarni bekor qiladi.');
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
