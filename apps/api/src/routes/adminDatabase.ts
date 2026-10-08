import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
import { requireAdmin } from './adminRoutes';
import { getPublicCityId } from './publicSupport';

/**
 * Admin "Baza" ekrani (2026-10-08): bitta so'rovda butun ko'rinish
 * (yozuvlar + toifalar + statistika + muammolar), holat/arxiv/ommaviy
 * amallar va toifalarni boshqarish. Har bir o'zgarish AuditLog'ga yoziladi.
 */

const SECTIONS = ['USTA', 'DOKON_OBYEKT', 'MUASSASA', 'TRANSPORT', 'ARENDA', 'ZAPRAVKA'] as const;
type Section = (typeof SECTIONS)[number];
const PLACEHOLDER_MFY = 'MFY tanlanmagan';
const STALE_DAYS = 90;
const STATS_DAYS = 30;

const digitsOf = (p: string) => (p || '').replace(/\D/g, '');
/** O'zbekiston raqami: 998 + 9 raqam (yoki 9 raqamli mahalliy). */
function phoneProblem(p: string): string | null {
  const d = digitsOf(p);
  if (d.length === 9) return null;
  if (d.length === 12 && d.startsWith('998')) return null;
  return "Telefon raqam noto'g'ri";
}

export async function adminDatabase(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req: any, reply) => {
    if (!(await requireAdmin(req, reply))) return reply;
  });

  const audit = (req: any, cityId: string | null, action: string, details: object) =>
    db.auditLog.create({ data: { userId: req.user?.id ?? null, cityId, action, details: details as any } }).catch(() => {});

  // ---------- Umumiy ko'rinish ----------
  fastify.get('/admin/db/overview', async () => {
    const cityId = await getPublicCityId();
    const since = new Date(Date.now() - STATS_DAYS * 86400_000);
    const [listings, categories, shown30, shownAll] = await Promise.all([
      db.listing.findMany({
        where: { cityId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, phone: true, type: true, status: true, moderationStatus: true, verification: true,
          source: true, priorityRank: true, photoUrls: true, createdAt: true, updatedAt: true, workFrom: true, workTo: true,
          jargonSynonyms: true, specificServices: true, ownerTelegramId: true,
          category: { select: { id: true, name: true, emoji: true, objectType: true, synonyms: true } },
          primaryLandmark: { select: { id: true, name: true } },
        },
      }),
      db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, emoji: true, objectType: true, group: true, synonyms: true } }),
      db.queryLog.groupBy({ by: ['resolvedListingId'], where: { cityId, isResolved: true, resolvedListingId: { not: null }, createdAt: { gte: since } }, _count: { _all: true } }),
      db.queryLog.groupBy({ by: ['resolvedListingId'], where: { cityId, isResolved: true, resolvedListingId: { not: null } }, _count: { _all: true } }),
    ]);

    const shown30Map = new Map(shown30.map((r) => [r.resolvedListingId!, r._count._all]));
    const shownAllMap = new Map(shownAll.map((r) => [r.resolvedListingId!, r._count._all]));

    // Takroriy raqam: oxirgi 9 raqam bo'yicha (arxivdagilar hisobga olinmaydi)
    const phoneCount = new Map<string, number>();
    for (const l of listings) {
      if (l.status === 'ARCHIVED') continue;
      const k = digitsOf(l.phone).slice(-9);
      if (k.length === 9) phoneCount.set(k, (phoneCount.get(k) || 0) + 1);
    }
    const staleBefore = Date.now() - STALE_DAYS * 86400_000;

    const items = listings.map((l) => {
      const section: Section = (l.category?.objectType as Section) || (l.type as Section);
      const issues: string[] = [];
      if (l.status !== 'ARCHIVED') {
        if (!l.primaryLandmark || l.primaryLandmark.name === PLACEHOLDER_MFY) issues.push("Mahalla tanlanmagan");
        const pp = phoneProblem(l.phone);
        if (pp) issues.push(pp);
        const k = digitsOf(l.phone).slice(-9);
        if (k.length === 9 && (phoneCount.get(k) || 0) > 1) issues.push('Bu raqam boshqa yozuvda ham bor');
        if (l.updatedAt.getTime() < staleBefore) issues.push(`${STALE_DAYS} kundan beri yangilanmagan`);
        if (l.category?.objectType && l.category.objectType !== l.type) issues.push("Turi toifasiga mos emas");
      }
      return {
        id: l.id,
        name: l.name.trim(),
        phone: l.phone,
        section,
        status: l.status,
        moderationStatus: l.moderationStatus,
        verified: l.verification === 'VERIFIED',
        source: l.source,
        priorityRank: l.priorityRank,
        photo: l.photoUrls[0] || null,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        hours: l.workFrom && l.workTo ? `${l.workFrom}–${l.workTo}` : null,
        categoryId: l.category?.id || null,
        categoryName: l.category?.name || '',
        categoryEmoji: l.category?.emoji || null,
        landmarkId: l.primaryLandmark?.id || null,
        landmarkName: l.primaryLandmark && l.primaryLandmark.name !== PLACEHOLDER_MFY ? l.primaryLandmark.name : null,
        search: [l.name, l.category?.name, l.primaryLandmark?.name, l.specificServices, ...(l.jargonSynonyms || []), ...(l.category?.synonyms || [])].filter(Boolean).join(' '),
        shown30: shown30Map.get(l.id) || 0,
        shownAll: shownAllMap.get(l.id) || 0,
        issues,
      };
    });

    const live = items.filter((i) => i.status !== 'ARCHIVED');
    const countByCat = new Map<string, number>();
    for (const i of live) if (i.categoryId) countByCat.set(i.categoryId, (countByCat.get(i.categoryId) || 0) + 1);
    const sectionCounts = Object.fromEntries(SECTIONS.map((s) => [s, live.filter((i) => i.section === s).length]));

    return {
      success: true,
      generatedAt: new Date(),
      listings: items,
      categories: categories.map((c) => ({ ...c, count: countByCat.get(c.id) || 0 })),
      sectionCounts,
      totals: {
        live: live.length,
        archived: items.length - live.length,
        problems: live.filter((i) => i.issues.length > 0).length,
      },
    };
  });

  // ---------- Bitta yozuv: holat / arxivdan qaytarish ----------
  fastify.post('/admin/db/listings/:id/status', async (req: any, reply) => {
    const status = String(req.body?.status || '');
    if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) return reply.code(400).send({ success: false, message: "Noto'g'ri holat" });
    const l = await db.listing.findUnique({ where: { id: req.params.id }, select: { id: true, status: true, cityId: true, moderationStatus: true } });
    if (!l) return reply.code(404).send({ success: false, message: 'Topilmadi' });
    if (status === 'ACTIVE' && l.moderationStatus === 'pending') {
      return reply.code(409).send({ success: false, message: "Bu yozuv tekshiruvda — «Shubhali e'lonlar» bo'limida tasdiqlang" });
    }
    await db.listing.update({
      where: { id: l.id },
      data: { status: status as any, ...(status === 'ACTIVE' ? { moderationStatus: null } : {}), ...(status === 'ARCHIVED' ? { priorityRank: null } : {}) },
    });
    audit(req, l.cityId, 'LISTING_STATUS', { listingId: l.id, from: l.status, to: status });
    return { success: true };
  });

  // ---------- Ommaviy amallar ----------
  fastify.post('/admin/db/bulk', async (req: any, reply) => {
    const ids: string[] = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((x: unknown) => typeof x === 'string').slice(0, 500);
    const action = String(req.body?.action || '');
    const value = req.body?.value ? String(req.body.value) : null;
    if (ids.length === 0) return reply.code(400).send({ success: false, message: 'Hech narsa tanlanmagan' });
    const cityId = await getPublicCityId();
    const where = { id: { in: ids }, cityId };
    let count = 0;

    if (action === 'pause') count = (await db.listing.updateMany({ where: { ...where, status: 'ACTIVE' }, data: { status: 'PAUSED' } })).count;
    else if (action === 'activate')
      count = (await db.listing.updateMany({ where: { ...where, status: { in: ['PAUSED', 'ARCHIVED'] }, NOT: { moderationStatus: 'pending' } }, data: { status: 'ACTIVE', moderationStatus: null } })).count;
    else if (action === 'archive') count = (await db.listing.updateMany({ where, data: { status: 'ARCHIVED', priorityRank: null } })).count;
    else if (action === 'setLandmark') {
      const lm = value ? await db.landmark.findFirst({ where: { id: value, cityId }, select: { id: true } }) : null;
      if (!lm) return reply.code(400).send({ success: false, message: 'Mahalla topilmadi' });
      count = (await db.listing.updateMany({ where, data: { primaryLandmarkId: lm.id } })).count;
    } else if (action === 'setCategory') {
      const cat = value ? await db.category.findUnique({ where: { id: value }, select: { id: true, objectType: true } }) : null;
      if (!cat) return reply.code(400).send({ success: false, message: 'Toifa topilmadi' });
      count = (await db.listing.updateMany({ where, data: { categoryId: cat.id, ...(cat.objectType ? { type: cat.objectType } : {}), priorityRank: null } })).count;
    } else return reply.code(400).send({ success: false, message: "Noma'lum amal" });

    audit(req, cityId, 'LISTING_BULK', { action, value, ids, count });
    return { success: true, count };
  });

  // ---------- Toifalar ----------
  fastify.put('/admin/db/categories/:id', async (req: any, reply) => {
    const c = await db.category.findUnique({ where: { id: req.params.id } });
    if (!c) return reply.code(404).send({ success: false, message: 'Toifa topilmadi' });
    const b = req.body || {};
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : undefined;
    if (name !== undefined && name.length < 2) return reply.code(400).send({ success: false, message: 'Nom juda qisqa' });
    if (name && name.toLowerCase() !== c.name.toLowerCase()) {
      const clash = await db.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, NOT: { id: c.id } } });
      if (clash) return reply.code(409).send({ success: false, message: `«${clash.name}» toifasi allaqachon bor — birlashtiring` });
    }
    const objectType = b.objectType !== undefined ? (SECTIONS.includes(b.objectType) ? b.objectType : null) : undefined;
    const emoji = b.emoji !== undefined ? (String(b.emoji || '').trim().slice(0, 8) || null) : undefined;
    const group = b.group !== undefined ? (String(b.group || '').trim().slice(0, 60) || null) : undefined;
    await db.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: c.id },
        data: {
          ...(name ? { name } : {}),
          ...(objectType !== undefined ? { objectType } : {}),
          ...(emoji !== undefined ? { emoji } : {}),
          ...(group !== undefined ? { group } : {}),
        },
      });
      // Toifa turi o'zgarsa — uning yozuvlari ham shu bo'limga ko'chadi
      if (objectType) await tx.listing.updateMany({ where: { categoryId: c.id }, data: { type: objectType } });
    });
    audit(req, null, 'CATEGORY_UPDATE', { categoryId: c.id, from: { name: c.name, objectType: c.objectType, emoji: c.emoji, group: c.group }, to: { name, objectType, emoji, group } });
    return { success: true };
  });

  fastify.post('/admin/db/categories/:id/merge', async (req: any, reply) => {
    const intoId = String(req.body?.intoId || '');
    if (!intoId || intoId === req.params.id) return reply.code(400).send({ success: false, message: 'Qaysi toifaga birlashtirishni tanlang' });
    const [from, into] = await Promise.all([db.category.findUnique({ where: { id: req.params.id } }), db.category.findUnique({ where: { id: intoId } })]);
    if (!from || !into) return reply.code(404).send({ success: false, message: 'Toifa topilmadi' });
    const synonyms = Array.from(new Set([...into.synonyms, ...from.synonyms, from.name.toLowerCase()].map((s) => s.trim()).filter(Boolean)));
    const moved = await db.$transaction(async (tx) => {
      const r = await tx.listing.updateMany({ where: { categoryId: from.id }, data: { categoryId: into.id, ...(into.objectType ? { type: into.objectType } : {}), priorityRank: null } });
      await tx.candidate.updateMany({ where: { categoryId: from.id }, data: { categoryId: into.id } });
      await tx.category.update({ where: { id: into.id }, data: { synonyms } });
      await tx.category.delete({ where: { id: from.id } });
      return r.count;
    });
    audit(req, null, 'CATEGORY_MERGE', { from: { id: from.id, name: from.name }, into: { id: into.id, name: into.name }, movedListings: moved });
    return { success: true, moved };
  });

  fastify.delete('/admin/db/categories/:id', async (req: any, reply) => {
    const c = await db.category.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, _count: { select: { listings: true, candidates: true } } } });
    if (!c) return reply.code(404).send({ success: false, message: 'Toifa topilmadi' });
    if (c._count.listings > 0 || c._count.candidates > 0) {
      return reply.code(409).send({ success: false, message: `Toifada ${c._count.listings} ta yozuv bor — avval ko'chiring yoki birlashtiring` });
    }
    await db.category.delete({ where: { id: c.id } });
    audit(req, null, 'CATEGORY_DELETE', { categoryId: c.id, name: c.name });
    return { success: true };
  });
}
