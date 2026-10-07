import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '../uploadsPath';
import { db } from '@kimbor/db';
import { createUserRental, updateUserRental, isRealImage } from './publicRentals';
import { getPublicCityId } from './publicSupport';
import { moderateSubmission } from './moderation';

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
    const body = { ...b, ...(fileIds.length || !b.editId ? { photos: [...(Array.isArray(b.keepPhotos) ? b.keepPhotos : []), ...photos] } : {}) };
    const r = b.editId ? await updateUserRental(BigInt(tgRaw), String(b.editId), body) : await createUserRental(BigInt(tgRaw), body, 'bot_chat');
    if (!r.success) return reply.code(r.code).send({ success: false, message: r.message });
    return r;
  });

  /**
   * Biznes / usta / do'kon — bot chatida o'zi qo'shilishi (2026-10-08).
   * Har doim admin tekshiruvidan o'tadi ("Shubhali e'lonlar" ekrani):
   * noto'g'ri raqam yoki soxta ma'lumot bazaga tasdiqsiz tushmasin.
   */
  fastify.post('/internal/business', async (req: any, reply) => {
    const b = req.body || {};
    const tgRaw = String(b.telegramId || '');
    if (!/^\d{3,20}$/.test(tgRaw)) return reply.code(400).send({ success: false, message: 'telegramId' });
    const tg = BigInt(tgRaw);
    const cityId = await getPublicCityId();
    const name = String(b.name || '').trim().slice(0, 80);
    const digits = String(b.phone || '').replace(/\D/g, '').slice(-9);
    const description = String(b.description || '').trim().slice(0, 400) || null;
    const hhmm = (x: unknown) => (typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x) ? x : null);
    if (name.length < 2) return reply.code(400).send({ success: false, message: 'Nomini yozing' });
    if (digits.length < 9) return reply.code(400).send({ success: false, message: "Telefon raqam to'liq emas" });
    const category = b.categoryId ? await db.category.findUnique({ where: { id: String(b.categoryId) }, select: { id: true, name: true, objectType: true } }) : null;
    if (!category) return reply.code(400).send({ success: false, message: 'Sohangizni tanlang' });
    const landmark = b.landmarkId ? await db.landmark.findFirst({ where: { id: String(b.landmarkId), cityId }, select: { id: true } }) : null;
    if (!landmark) return reply.code(400).send({ success: false, message: 'Mahallani tanlang' });

    const fileIds: string[] = (Array.isArray(b.photoFileIds) ? b.photoFileIds : []).filter((x: unknown) => typeof x === 'string').slice(0, 5);
    const newPhotos = (await Promise.all(fileIds.map(saveTelegramPhoto))).filter((x): x is string => !!x);
    const phone = `+998${digits}`;

    const mod = await moderateSubmission({ kind: 'candidate', title: name, description, phone: digits, ownerTelegramId: tg });
    if (mod.verdict === 'spam') return reply.code(400).send({ success: false, message: `Qabul qilinmadi: ${mod.reasons.join('; ')}` });
    const reasons = mod.reasons.length ? mod.reasons : ["Yangi biznes — botda o'zi qo'shildi"];

    const data = {
      name,
      phone,
      categoryId: category.id,
      type: category.objectType || 'USTA',
      primaryLandmarkId: landmark.id,
      workFrom: hhmm(b.workFrom),
      workTo: hhmm(b.workTo),
      specificServices: String(b.services || '').trim().slice(0, 300) || null,
      description,
      status: 'PAUSED' as const,
      moderationStatus: 'pending',
      moderationReasons: reasons,
      rejectionNote: null,
    };

    if (b.editId) {
      const own = await db.listing.findFirst({ where: { id: String(b.editId), ownerTelegramId: tg }, select: { id: true, photoUrls: true } });
      if (!own) return reply.code(404).send({ success: false, message: 'Topilmadi' });
      await db.listing.update({ where: { id: own.id }, data: { ...data, photoUrls: newPhotos.length ? newPhotos : own.photoUrls } });
      return { success: true, id: own.id, pending: true };
    }

    const today = await db.listing.count({ where: { ownerTelegramId: tg, createdAt: { gte: new Date(Date.now() - 86400_000) } } });
    if (today >= 3) return reply.code(429).send({ success: false, message: "Bugun 3 ta ma'lumot qo'shdingiz — ertaga yana qo'shishingiz mumkin" });
    const dup = await db.listing.findFirst({ where: { cityId, phone: { endsWith: digits }, categoryId: category.id, status: { not: 'ARCHIVED' } }, select: { name: true, status: true } });
    if (dup) return reply.code(409).send({ success: false, message: `Bu raqam bilan «${dup.name}» allaqachon bazada bor` });

    const listing = await db.listing.create({
      data: { ...data, cityId, source: 'bot_chat', ownerTelegramId: tg, verification: 'COMMUNITY_UNVERIFIED', photoUrls: newPhotos, badges: [], jargonSynonyms: [] },
      select: { id: true },
    });
    await db.auditLog.create({ data: { cityId, action: 'USER_BUSINESS_SUBMITTED', details: { listingId: listing.id, telegramId: tgRaw, category: category.name } } }).catch(() => {});
    return { success: true, id: listing.id, pending: true };
  });
}
