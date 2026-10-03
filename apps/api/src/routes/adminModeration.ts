import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
import { requireAdmin } from './adminRoutes';
import { PUBLIC_LISTING_SELECT, toPublicCard, getPublicCityId } from './publicSupport';
import { validateRental, kindOfCategory } from './publicRentals';
import { notifyOwnerRejected } from './moderation';

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
    await db.listing.update({ where: { id: req.params.id }, data: { status: 'ACTIVE', moderationStatus: null, rejectionNote: null } });
    audit(req, 'MODERATION_APPROVE', { listingId: req.params.id });
    return { success: true };
  });

  fastify.post('/admin/moderation/listings/:id/reject', async (req: any, reply) => {
    const reason = String(req.body?.reason || '').trim().slice(0, 400);
    if (!reason) return reply.code(400).send({ success: false, message: 'Sababini yozing' });
    const l = await db.listing.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED', moderationStatus: 'rejected', rejectionNote: reason },
      select: { name: true, ownerTelegramId: true },
    });
    if (l.ownerTelegramId) await notifyOwnerRejected(l.ownerTelegramId, l.name, reason);
    audit(req, 'MODERATION_REJECT', { listingId: req.params.id, reason });
    return { success: true, notified: !!l.ownerTelegramId };
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
