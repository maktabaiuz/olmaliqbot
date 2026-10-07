import { normalizeText, containsWholeWord } from '@kimbor/core';
import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
import { requireAdmin } from './adminRoutes';
import { PUBLIC_LISTING_SELECT, toPublicCard, getPublicCityId } from './publicSupport';
import { validateRental, kindOfCategory } from './publicRentals';
import { notifyOwnerRejected, notifyOwnerApproved } from './moderation';

/**
 * Admin: "Shubhali e'lonlar" va "Ijara e'lonlari" (2026-10). Ijara
 * qo'shish/tahrirlash foydalanuvchi ilovasidagi bilan BIR XIL tekshiruvdan
 * (validateRental) o'tadi — ikki joyda ma'lumot bir xil ko'rinishda saqlanadi.
 */
const audit = (req: any, action: string, details: object) =>
  db.auditLog.create({ data: { userId: req.user?.id ?? null, cityId: req.user?.cityId ?? null, action, details: details as any } }).catch(() => {});

export async function adminModeration(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req: any, reply) => {
    if (!(await requireAdmin(req, reply))) return reply;
  });

  const ADMIN_SELECT = { ...PUBLIC_LISTING_SELECT, status: true, moderationStatus: true, moderationReasons: true, rejectionNote: true, phone: true, ownerTelegramId: true, source: true, createdAt: true } as const;
  const adminCard = (l: any) => ({
    ...toPublicCard(l),
    status: l.status,
    moderationStatus: l.moderationStatus,
    moderationReasons: l.moderationReasons,
    rejectionNote: l.rejectionNote,
    phone: l.phone,
    fromUser: l.ownerTelegramId != null,
    source: l.source,
    createdAt: l.createdAt,
  });

  fastify.get('/admin/moderation', async () => {
    const [listings, candidates] = await Promise.all([
      db.listing.findMany({ where: { moderationStatus: 'pending' }, orderBy: { createdAt: 'desc' }, select: ADMIN_SELECT }),
      db.candidate.findMany({
        where: { status: 'PENDING', NOT: { moderationReasons: { isEmpty: true } } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true, moderationReasons: true, createdAt: true, category: { select: { name: true } } },
      }),
    ]);
    return { success: true, listings: listings.map(adminCard), candidates };
  });

  fastify.post('/admin/moderation/listings/:id/approve', async (req: any) => {
    const l = await db.listing.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE', moderationStatus: null, rejectionNote: null },
      select: { id: true, name: true, ownerTelegramId: true, source: true, type: true },
    });
    const notified = l.ownerTelegramId ? await notifyOwnerApproved(l) : false;
    audit(req, 'MODERATION_APPROVE', { listingId: req.params.id, notified });
    return { success: true, notified };
  });

  fastify.post('/admin/moderation/listings/:id/reject', async (req: any, reply) => {
    const reason = String(req.body?.reason || '').trim().slice(0, 400);
    if (!reason) return reply.code(400).send({ success: false, message: 'Sababini yozing' });
    const l = await db.listing.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED', moderationStatus: 'rejected', rejectionNote: reason },
      select: { id: true, name: true, ownerTelegramId: true, source: true, type: true },
    });
    const notified = l.ownerTelegramId ? await notifyOwnerRejected(l, reason) : false;
    audit(req, 'MODERATION_REJECT', { listingId: req.params.id, reason, notified });
    return { success: true, notified };
  });

  // ---------- Ijara e'lonlari (hammasi) ----------
  fastify.get('/admin/rentals', async () => {
    const cityId = await getPublicCityId();
    const rows = await db.listing.findMany({ where: { cityId, type: 'ARENDA' }, orderBy: { createdAt: 'desc' }, select: ADMIN_SELECT });
    return { success: true, items: rows.map(adminCard) };
  });

  fastify.get('/admin/rentals/:id', async (req: any, reply) => {
    const l = await db.listing.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, phone: true, roomCount: true, rentPrice: true, rentPriceCurrency: true, rentTermType: true, primaryLandmarkId: true, photoUrls: true, description: true, status: true, category: { select: { name: true } } },
    });
    if (!l) return reply.code(404).send({ success: false });
    return { success: true, item: { ...l, kind: kindOfCategory(l.category?.name || '') } };
  });

  fastify.post('/admin/rentals', async (req: any, reply) => {
    const v = await validateRental(req.body || {});
    if ('error' in v) return reply.code(400).send({ success: false, message: v.error });
    const l = await db.listing.create({
      data: { ...v.data, type: 'ARENDA', status: 'ACTIVE', verification: 'VERIFIED', source: 'manual', jargonSynonyms: [], badges: [] },
      select: { id: true },
    });
    audit(req, 'ADMIN_RENTAL_CREATE', { listingId: l.id });
    return { success: true, id: l.id };
  });

  fastify.put('/admin/rentals/:id', async (req: any, reply) => {
    const v = await validateRental(req.body || {});
    if ('error' in v) return reply.code(400).send({ success: false, message: v.error });
    await db.listing.update({ where: { id: req.params.id }, data: { ...v.data, moderationStatus: null, rejectionNote: null } });
    audit(req, 'ADMIN_RENTAL_UPDATE', { listingId: req.params.id });
    return { success: true };
  });

  fastify.post('/admin/rentals/:id/status', async (req: any, reply) => {
    const st = req.body?.status;
    if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(st)) return reply.code(400).send({ success: false });
    await db.listing.update({ where: { id: req.params.id }, data: { status: st, ...(st === 'ACTIVE' ? { moderationStatus: null } : {}) } });
    audit(req, 'ADMIN_RENTAL_STATUS', { listingId: req.params.id, status: st });
    return { success: true };
  });

  fastify.delete('/admin/rentals/:id', async (req: any) => {
    await db.listing.delete({ where: { id: req.params.id } });
    audit(req, 'ADMIN_RENTAL_DELETE', { listingId: req.params.id });
    return { success: true };
  });

  fastify.get('/admin/landmarks-lite', async () => {
    const cityId = await getPublicCityId();
    return db.landmark.findMany({ where: { cityId }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  });
}

// ---------- MFY biriktirish takliflari (2026-10-08) ----------
// "MFY tanlanmagan" yozuvlar uchun: yozuv jargoni/nomi/xizmatlarida MFY'ning
// mahalliy jargoni (masalan "5/1", "deska") uchrasa — o'sha MFY taklif qilinadi.
// Admin bir bosishda tasdiqlaydi; avtomatik o'zgartirilmaydi.
export async function computeMfySuggestions(cityId: string) {
  const lms = await db.landmark.findMany({ where: { cityId }, select: { id: true, name: true, synonyms: true } });
  const placeholder = lms.find((l) => l.name === 'MFY tanlanmagan');
  const mfys = lms.filter((l) => l.name !== 'MFY tanlanmagan');
  const listings = await db.listing.findMany({
    where: { cityId, ...(placeholder ? { primaryLandmarkId: placeholder.id } : {}) },
    select: { id: true, name: true, jargonSynonyms: true, specificServices: true, description: true, category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  return listings.map((l) => {
    const text = normalizeText([l.name, ...l.jargonSynonyms, l.specificServices || '', l.description || ''].join(' | '));
    const scored = mfys
      .map((m) => {
        const base = normalizeText(m.name.replace(/\s*MFY$/i, ''));
        const terms = Array.from(new Set([base, ...m.synonyms.map((x) => normalizeText(x))])).filter((t) => t && t.replace(/\s/g, '').length >= 3);
        const hits = terms.filter((t) => containsWholeWord(text, t) || (/\d/.test(t) && text.includes(t)));
        return { id: m.id, name: m.name, hits };
      })
      .filter((x) => x.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length || b.hits.join('').length - a.hits.join('').length);
    return {
      listingId: l.id,
      listingName: l.name,
      category: l.category?.name || '',
      suggestion: scored[0] ? { id: scored[0].id, name: scored[0].name, evidence: scored[0].hits.slice(0, 4) } : null,
      alternatives: scored.slice(1, 3).map((x) => ({ id: x.id, name: x.name })),
    };
  });
}

export async function mfyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req: any, reply) => {
    if (!(await requireAdmin(req, reply))) return reply;
  });
  fastify.get('/admin/mfy-suggestions', async () => {
    const cityId = await getPublicCityId();
    const items = await computeMfySuggestions(cityId);
    const mfys = await db.landmark.findMany({ where: { cityId, NOT: { name: 'MFY tanlanmagan' } }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    return { success: true, items, mfys };
  });
  fastify.post('/admin/mfy-suggestions/apply', async (req: any, reply) => {
    const cityId = await getPublicCityId();
    const { listingId, landmarkId } = req.body || {};
    const lm = await db.landmark.findFirst({ where: { id: String(landmarkId), cityId }, select: { id: true, name: true } });
    if (!lm) return reply.code(400).send({ success: false, message: 'MFY topilmadi' });
    const r = await db.listing.updateMany({ where: { id: String(listingId), cityId }, data: { primaryLandmarkId: lm.id } });
    if (!r.count) return reply.code(404).send({ success: false });
    audit(req, 'MFY_ASSIGN', { listingId, landmarkId: lm.id, name: lm.name });
    return { success: true };
  });
}
