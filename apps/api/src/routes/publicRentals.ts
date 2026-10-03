import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '@kimbor/db';
import { UPLOADS_DIR } from '../uploadsPath';
import { getPublicCityId, PUBLIC_LISTING_SELECT, toPublicCard } from './publicSupport';

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
      const name = `${crypto.randomUUID()}.${ext}`;
      await fs.promises.mkdir(path.join(UPLOADS_DIR, 'listings'), { recursive: true });
      await fs.promises.writeFile(path.join(UPLOADS_DIR, 'listings', name), await file.toBuffer());
      uploadCount.set(dayKey, used + 1);
      return { success: true, url: `/api/uploads/listings/${name}` };
    } catch (err: any) {
      if (err?.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(400).send({ success: false, message: "Rasm 5 MB dan katta bo'lmasin" });
      return reply.code(400).send({ success: false, message: 'Rasm yuklanmadi' });
    }
  });

  fastify.post('/public/rentals', async (req: any, reply) => {
    const cityId = await getPublicCityId();
    const tg: bigint = req.publicUser.telegramId;
    const b = req.body || {};
    const kind = String(b.kind || 'kvartira');
    const rooms = Number.isFinite(Number(b.rooms)) && Number(b.rooms) > 0 ? Math.min(20, Math.round(Number(b.rooms))) : null;
    const price = Math.round(Number(b.price));
    const currency = b.currency === 'UZS' ? 'UZS' : 'USD';
    const term = ['KUNLIK', 'OYLIK', 'YILLIK'].includes(b.term) ? b.term : 'OYLIK';
    const phone = String(b.phone || '').replace(/[^\d+]/g, '');
    const digits = phone.replace(/\D/g, '');
    const photos = (Array.isArray(b.photos) ? b.photos : []).filter((u: unknown) => typeof u === 'string' && /^\/api\/uploads\/listings\/[\w-]+\.(jpg|png|webp)$/.test(u)).slice(0, 8);
    const description = String(b.description || '').trim().slice(0, 600);
    if (!KINDS[kind]) return reply.code(400).send({ success: false, message: "Uy turini tanlang" });
    if (!Number.isFinite(price) || price <= 0) return reply.code(400).send({ success: false, message: 'Narxni kiriting' });
    if (digits.length < 9) return reply.code(400).send({ success: false, message: "Telefon raqam to'liq emas" });
    if (!b.landmarkId) return reply.code(400).send({ success: false, message: 'Mahallani tanlang' });
    const landmark = await db.landmark.findFirst({ where: { id: String(b.landmarkId), cityId }, select: { id: true, name: true } });
    if (!landmark) return reply.code(400).send({ success: false, message: 'Mahalla topilmadi' });

    const today = await db.listing.count({ where: { ownerTelegramId: tg, createdAt: { gte: new Date(Date.now() - 86400_000) } } });
    if (today >= RENTALS_PER_DAY) return reply.code(429).send({ success: false, message: "Bugun 3 ta e'lon berdingiz — ertaga yana qo'shishingiz mumkin" });
    const categoryId = await rentalCategoryId(kind);
    if (!categoryId) return reply.code(500).send({ success: false, message: 'Ijara kategoriyasi topilmadi' });

    const name = `${rooms ? `${rooms} xonali ` : ''}${KINDS[kind].label}`.replace(/^./, (c) => c.toUpperCase());
    const listing = await db.listing.create({
      data: {
        cityId,
        categoryId,
        type: 'ARENDA',
        name,
        phone: digits.length === 9 ? `+998${digits}` : `+${digits}`,
        primaryLandmarkId: landmark.id,
        roomCount: rooms,
        rentPrice: price,
        rentPriceCurrency: currency,
        rentTermType: term,
        photoUrls: photos,
        description: description || null,
        status: 'PAUSED',
        source: 'webapp',
        ownerTelegramId: tg,
        jargonSynonyms: [],
        badges: [],
      },
      select: { id: true },
    });
    await db.auditLog.create({ data: { cityId, action: 'USER_RENTAL_SUBMITTED', details: { listingId: listing.id, telegramId: tg.toString(), name } } }).catch(() => {});
    notifyAdmins(
      `🏠 <b>Yangi ijara e'loni</b> (tasdiq kutmoqda)\n\n${esc(name)} · ${landmark.name ? esc(landmark.name) : ''}\n💵 ${price} ${currency === 'USD' ? '$' : "so'm"} / ${term.toLowerCase()}\n📷 ${photos.length} ta rasm\n\nAdmin panel → Baza → "To'xtatilgan" bo'limidan tasdiqlang.`
    ).catch(() => {});
    return { success: true, id: listing.id };
  });

  // Mening e'lonlarim (holati bilan)
  fastify.get('/public/me/rentals', async (req: any) => {
    const rows = await db.listing.findMany({
      where: { ownerTelegramId: req.publicUser.telegramId },
      orderBy: { createdAt: 'desc' },
      select: { ...PUBLIC_LISTING_SELECT, status: true },
    });
    return { success: true, items: rows.map((r) => ({ ...toPublicCard(r), status: r.status })) };
  });

  // "Berildi" — e'lonni yopish (faqat egasi)
  fastify.post('/public/rentals/:id/close', async (req: any, reply) => {
    const r = await db.listing.updateMany({ where: { id: req.params.id, ownerTelegramId: req.publicUser.telegramId }, data: { status: 'ARCHIVED' } });
    if (r.count === 0) return reply.code(404).send({ success: false });
    return { success: true };
  });
}

const uploadCount = new Map<string, number>();
