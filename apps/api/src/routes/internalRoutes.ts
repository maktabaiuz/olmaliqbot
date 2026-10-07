import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '../uploadsPath';
import { createUserRental, isRealImage } from './publicRentals';

/**
 * Bot → API ichki so'rovlari (2026-10-08). Bot chatidagi AI suhbat orqali
 * yig'ilgan ijara e'loni ilovadagi bilan AYNAN bir xil yo'ldan (limit,
 * tekshiruv, moderatsiya) o'tishi uchun bot uni shu yerga yuboradi.
 * Kalit BOT_TOKEN'dan hosil qilinadi — tashqaridan chaqirib bo'lmaydi.
 */
export function internalKey(): string | null {
  const token = process.env.BOT_TOKEN;
  return token ? crypto.createHash('sha256').update(`internal:${token}`).digest('hex') : null;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

async function saveTelegramPhoto(fileId: string): Promise<string | null> {
  const token = process.env.BOT_TOKEN;
  if (!token) return null;
  try {
    const meta: any = await (await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`)).json();
    const filePath: string | undefined = meta?.result?.file_path;
    if (!filePath || (meta.result.file_size || 0) > MAX_PHOTO_BYTES) return null;
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isRealImage(buf)) return null;
    const ext = buf[0] === 0xff ? 'jpg' : buf[0] === 0x89 ? 'png' : 'webp';
    const name = `${crypto.randomUUID()}.${ext}`;
    await fs.promises.mkdir(path.join(UPLOADS_DIR, 'listings'), { recursive: true });
    await fs.promises.writeFile(path.join(UPLOADS_DIR, 'listings', name), buf);
    return `/api/uploads/listings/${name}`;
  } catch {
    return null;
  }
}

export async function internalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (req, reply) => {
    const expected = internalKey();
    const got = String(req.headers['x-internal-key'] || '');
    if (!expected || got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
      return reply.code(403).send({ success: false });
    }
  });

  fastify.post('/internal/rentals', async (req: any, reply) => {
    const b = req.body || {};
    const tgRaw = String(b.telegramId || '');
    if (!/^\d{3,20}$/.test(tgRaw)) return reply.code(400).send({ success: false, message: 'telegramId' });
    const fileIds: string[] = (Array.isArray(b.photoFileIds) ? b.photoFileIds : []).filter((x: unknown) => typeof x === 'string').slice(0, 8);
    const photos = (await Promise.all(fileIds.map(saveTelegramPhoto))).filter((x): x is string => !!x);
    const r = await createUserRental(BigInt(tgRaw), { ...b, photos }, 'bot_chat');
    if (!r.success) return reply.code(r.code).send({ success: false, message: r.message });
    return r;
  });
}
