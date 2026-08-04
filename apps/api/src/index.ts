import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { adminRoutes } from './routes/adminRoutes';

dotenv.config({ path: '../../.env' });

const fastify = Fastify({ logger: true });

async function main() {
  await fastify.register(cors, { origin: true });
  await fastify.register(adminRoutes, { prefix: '/api' });

  fastify.get('/health', async () => {
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
