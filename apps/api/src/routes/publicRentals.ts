import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '@kimbor/db';
import { UPLOADS_DIR } from '../uploadsPath';
import { getPublicCityId, PUBLIC_LISTING_SELECT, toPublicCard } from './publicSupport';
import { moderateSubmission } from './moderation';

/**
 * Ijara e'lonlari (2026-10) — uy egasi ilovadan o'zi e'lon beradi.
 * E'lon PAUSED holatda tushadi (admin panel → "To'xtatilgan"), admin
 * tasdiqlab ACTIVE qiladi. Adminlarga botdan xabar boradi.
 */
const KINDS: Record<string, { label: string; words: string[] }> = {
  kvartira: { label: 'kvartira', words: ['kvartira'] },
  hovli: { label: 'hovli uy', words: ['hovli', 'uy arenda', 'uy ijara'] },
  xona: { label: 'xona', words: ['xona', 'yotoqxona'] },
  ofis: { label: 'ofis', words: ['ofis', 'офис'] },
  dokon: { label: "do'kon / joy", words: ["do'kon", 'dokon', 'savdo', 'ombor'] },
};
const MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const RENT_PHOTOS_PER_DAY = 30;
const RENTALS_PER_DAY = 3;
const NOTIFY_ADMINS = false;

async function rentalCategoryId(kind: string): Promise<string | null> {
  const cats = await db.category.findMany({ select: { id: true, name: true, objectType: true } });
  const rent = cats.filter((c) => /arenda|ijara/i.test(c.name) && !/asbob|mashina|avto|uskuna/i.test(c.name));
  const words = KINDS[kind]?.words || [];
  const hit = rent.find((c) => words.some((w) => c.name.toLowerCase().includes(w)));
  return (hit || rent.find((c) => /kvartira/i.test(c.name)) || rent[0])?.id || null;
}

async function notifyAdmins(text: string) {
  const token = process.env.BOT_TOKEN;
  if (!token) return;
  const admins = await db.user.findMany({ where: { role: 'SUPER_ADMIN', isSuspended: false }, select: { telegramId: true } });
  for (const a of admins) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: a.telegramId.toString(), text, parse_mode: 'HTML' }),
    }).catch(() => {});
  }
}

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

export function registerRentals(fastify: FastifyInstance) {
  // Rasm yuklash (faqat ijara e'loni uchun)
  fastify.post('/public/upload-photo', async (req: any, reply) => {
    const tg = req.publicUser.telegramId.toString();
    const dayKey = `${tg}:${new Date().toISOString().slice(0, 10)}`;
    const used = uploadCount.get(dayKey) || 0;
    if (used >= RENT_PHOTOS_PER_DAY) return reply.code(429).send({ success: false, message: 'Bugungi rasm limiti tugadi' });
    try {
      const file = await req.file();
      if (!file) return reply.code(400).send({ success: false, message: 'Rasm topilmadi' });
      const ext = MIME[file.mimetype];
      if (!ext) return reply.code(400).send({ success: false, message: 'Faqat JPG, PNG yoki WebP' });
      const buf = await file.toBuffer();
      if (file.file?.truncated) return reply.code(400).send({ success: false, message: "Rasm 5 MB dan katta bo'lmasin" });
      if (!isRealImage(buf)) return reply.code(400).send({ success: false, message: 'Fayl rasm emas' });
      const name = `${crypto.randomUUID()}.${ext}`;
      await fs.promises.mkdir(path.join(UPLOADS_DIR, 'listings'), { recursive: true });
      await fs.promises.writeFile(path.join(UPLOADS_DIR, 'listings', name), buf);
      uploadCount.set(dayKey, used + 1);
      return { success: true, url: `/api/uploads/listings/${name}` };
    } catch (err: any) {
      if (err?.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(400).send({ success: false, message: "Rasm 5 MB dan katta bo'lmasin" });
      return reply.code(400).send({ success: false, message: 'Rasm yuklanmadi' });
    }
  });

  fastify.post('/public/rentals', async (req: any, reply) => {
    const tg: bigint = req.publicUser.telegramId;
    const today = await db.listing.count({ where: { ownerTelegramId: tg, createdAt: { gte: new Date(Date.now() - 86400_000) } } });
    if (today >= RENTALS_PER_DAY) return reply.code(429).send({ success: false, message: "Bugun 3 ta e'lon berdingiz — ertaga yana qo'shishingiz mumkin" });
    const v = await validateRental(req.body || {});
    if ('error' in v) return reply.code(400).send({ success: false, message: v.error });
    const mod = await moderateSubmission({ kind: 'rental', title: v.data.name, description: v.data.description, phone: v.digits, ownerTelegramId: tg, price: v.data.rentPrice, currency: v.data.rentPriceCurrency, term: v.data.rentTermType, rooms: v.data.roomCount, photos: v.data.photoUrls });
    if (mod.verdict === 'spam') return reply.code(400).send({ success: false, message: `E'lon qabul qilinmadi: ${mod.reasons.join('; ')}` });
    const pending = mod.verdict === 'suspicious';
    const listing = await db.listing.create({
      data: {
        ...v.data,
        type: 'ARENDA',
        status: pending ? 'PAUSED' : 'ACTIVE',
        verification: 'COMMUNITY_UNVERIFIED',
        source: 'webapp',
        ownerTelegramId: tg,
        moderationStatus: pending ? 'pending' : null,
        moderationReasons: mod.reasons,
        jargonSynonyms: [],
        badges: [],
      },
      select: { id: true, cityId: true },
    });
    await db.auditLog.create({ data: { cityId: listing.cityId, action: 'USER_RENTAL_SUBMITTED', details: { listingId: listing.id, telegramId: tg.toString(), verdict: mod.verdict, reasons: mod.reasons } } }).catch(() => {});
    if (NOTIFY_ADMINS && pending) notifyAdmins(`⚠️ Shubhali ijara e'loni: ${esc(v.data.name)}\n${esc(mod.reasons.join('; '))}`).catch(() => {});
    return { success: true, id: listing.id, pending, reasons: pending ? mod.reasons : [] };
  });

  // Tahrirlash (faqat egasi) — qayta tekshiruvdan o'tadi
  fastify.put('/public/rentals/:id', async (req: any, reply) => {
    const tg: bigint = req.publicUser.telegramId;
    const own = await db.listing.findFirst({ where: { id: req.params.id, ownerTelegramId: tg }, select: { id: true } });
    if (!own) return reply.code(404).send({ success: false, message: "E'lon topilmadi" });
    const v = await validateRental(req.body || {});
    if ('error' in v) return reply.code(400).send({ success: false, message: v.error });
    const mod = await moderateSubmission({ kind: 'rental', title: v.data.name, description: v.data.description, phone: v.digits, ownerTelegramId: tg, price: v.data.rentPrice, currency: v.data.rentPriceCurrency, term: v.data.rentTermType, rooms: v.data.roomCount, photos: v.data.photoUrls, excludeListingId: own.id });
    if (mod.verdict === 'spam') return reply.code(400).send({ success: false, message: `O'zgarish qabul qilinmadi: ${mod.reasons.join('; ')}` });
    const pending = mod.verdict === 'suspicious';
    await db.listing.update({
      where: { id: own.id },
      data: { ...v.data, status: pending ? 'PAUSED' : 'ACTIVE', moderationStatus: pending ? 'pending' : null, moderationReasons: mod.reasons, rejectionNote: null },
    });
    return { success: true, pending, reasons: pending ? mod.reasons : [] };
  });

  // O'chirish (faqat egasi)
  fastify.delete('/public/rentals/:id', async (req: any, reply) => {
    const r = await db.listing.deleteMany({ where: { id: req.params.id, ownerTelegramId: req.publicUser.telegramId } });
    if (r.count === 0) return reply.code(404).send({ success: false });
    return { success: true };
  });

  // Bitta o'z e'lonim (tahrirlash formasi uchun)
  fastify.get('/public/me/rentals/:id', async (req: any, reply) => {
    const l = await db.listing.findFirst({
      where: { id: req.params.id, ownerTelegramId: req.publicUser.telegramId },
      select: { id: true, name: true, phone: true, roomCount: true, rentPrice: true, rentPriceCurrency: true, rentTermType: true, primaryLandmarkId: true, photoUrls: true, description: true, category: { select: { name: true } } },
    });
    if (!l) return reply.code(404).send({ success: false });
    return { success: true, item: { ...l, kind: kindOfCategory(l.category?.name || '') } };
  });

  // Mening e'lonlarim (holati bilan)
  fastify.get('/public/me/rentals', async (req: any) => {
    const rows = await db.listing.findMany({
      where: { ownerTelegramId: req.publicUser.telegramId },
      orderBy: { createdAt: 'desc' },
      select: { ...PUBLIC_LISTING_SELECT, status: true, moderationStatus: true, rejectionNote: true },
    });
    return {
      success: true,
      items: rows.map((r) => ({ ...toPublicCard(r), status: r.status, moderationStatus: r.moderationStatus, rejectionNote: r.rejectionNote })),
    };
  });

  // "Berildi" — e'lonni yopish (faqat egasi)
  fastify.post('/public/rentals/:id/close', async (req: any, reply) => {
    const r = await db.listing.updateMany({ where: { id: req.params.id, ownerTelegramId: req.publicUser.telegramId }, data: { status: 'ARCHIVED' } });
    if (r.count === 0) return reply.code(404).send({ success: false });
    return { success: true };
  });
}

const uploadCount = new Map<string, number>();

/** Faylning o'zi (sarlavhasi emas) JPEG/PNG/WebP ekanini tekshiradi. */
export function isRealImage(b: Buffer): boolean {
  if (b.length < 12) return false;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  return b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP';
}

export function kindOfCategory(name: string): string {
  const n = name.toLowerCase();
  return Object.entries(KINDS).find(([, k]) => k.words.some((w) => n.includes(w)))?.[0] || 'kvartira';
}

/** Ijara ma'lumotini tekshirish va Listing maydonlariga aylantirish — foydalanuvchi va admin uchun BIR XIL. */
export async function validateRental(b: any): Promise<{ error: string } | { digits: string; data: any }> {
  const cityId = await getPublicCityId();
  const kind = String(b.kind || 'kvartira');
  const rooms = Number.isFinite(Number(b.rooms)) && Number(b.rooms) > 0 ? Math.min(20, Math.round(Number(b.rooms))) : null;
  const price = Math.round(Number(b.price));
  const currency: 'USD' | 'UZS' = b.currency === 'UZS' ? 'UZS' : 'USD';
  const term: 'KUNLIK' | 'OYLIK' | 'YILLIK' = ['KUNLIK', 'OYLIK', 'YILLIK'].includes(b.term) ? b.term : 'OYLIK';
  const digits = String(b.phone || '').replace(/\D/g, '').slice(-12);
  const photos = (Array.isArray(b.photos) ? b.photos : []).filter((u: unknown) => typeof u === 'string' && /^\/api\/uploads\/listings\/[\w-]+\.(jpg|png|webp)$/.test(u)).slice(0, 8);
  const description = String(b.description || '').trim().slice(0, 600);
  if (!KINDS[kind]) return { error: 'Uy turini tanlang' };
  if (!Number.isFinite(price) || price <= 0) return { error: 'Narxni kiriting' };
  if (digits.length < 9) return { error: "Telefon raqam to'liq emas" };
  if (!b.landmarkId) return { error: 'Mahallani tanlang' };
  const landmark = await db.landmark.findFirst({ where: { id: String(b.landmarkId), cityId }, select: { id: true } });
  if (!landmark) return { error: 'Mahalla topilmadi' };
  const categoryId = await rentalCategoryId(kind);
  if (!categoryId) return { error: 'Ijara kategoriyasi topilmadi' };
  const name = `${rooms ? `${rooms} xonali ` : ''}${KINDS[kind].label}`.replace(/^./, (c) => c.toUpperCase());
  return {
    digits: digits.slice(-9),
    data: {
      cityId,
      categoryId,
      name,
      phone: digits.length === 9 ? `+998${digits}` : `+${digits}`,
      primaryLandmarkId: landmark.id,
      roomCount: rooms,
      rentPrice: price,
      rentPriceCurrency: currency,
      rentTermType: term,
      photoUrls: photos,
      description: description || null,
    },
  };
}
