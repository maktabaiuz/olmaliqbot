import Fastify from 'fastify';
import cors from '@fastify/cors';
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
  await fastify.register(cors, { origin: true });
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
