import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
import {
  classifyQuery,
  searchListings,
  buildSearchParams,
  isNonSearchMessage,
  sanitizeAiLandmarkName,
  findLocalDispatcherMatch,
  getCoreEmergencyNumbers,
  CORE_EMERGENCY_KEYS,
  containsProfanity,
} from '@kimbor/core';
import { IntentType } from '@kimbor/types';
import {
  authPublicUser,
  getPublicCityId,
  getMissingChannelsForUser,
  PUBLIC_LISTING_SELECT,
  toPublicCard,
  PHONE_LIMIT_PER_HOUR,
  PHONE_LIMIT_PER_DAY,
  CANDIDATE_LIMIT_PER_DAY,
} from './publicSupport';
import { registerAssistant } from './publicAssistant';
import { registerRentals } from './publicRentals';

/**
 * Foydalanuvchi ilovasi API'si (2026-10) — `/api/public/*`. Admin
 * API'dan alohida: faqat o'qish, saqlash, baholash, taklif yuborish.
 * Qidiruv bot bilan AYNAN bir xil pipeline (klassifikator + searchListings
 * + AI tekshiruv) — ilovada alohida, zaifroq qidiruv yo'q.
 */
export async function publicRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req: any, reply) => {
    const user = authPublicUser(req);
    if (!user) return reply.code(401).send({ success: false, message: 'Telegram orqali oching' });
    req.publicUser = user;
  });

  const ACTIVE = { status: 'ACTIVE' as const };
  registerAssistant(fastify);
  registerRentals(fastify);

  // Obuna holati (onboarding ekrani)
  fastify.get('/public/me/subscription', async (req: any) => {
    const missing = await getMissingChannelsForUser(req.publicUser.telegramId);
    return { success: true, ok: missing.length === 0, missing };
  });

  // Bosh sahifa: kategoriyalar soni, ko'p so'ralganlar, hozir ochiqlar
  fastify.get('/public/home', async () => {
    const cityId = await getPublicCityId();
    const listings = await db.listing.findMany({ where: { cityId, ...ACTIVE }, select: PUBLIC_LISTING_SELECT });
    const cards = listings.map(toPublicCard);
    const byType: Record<string, number> = {};
    for (const c of cards) byType[c.type] = (byType[c.type] || 0) + 1;
    const since = new Date(Date.now() - 30 * 86400_000);
    const popular = await db.queryLog.groupBy({
      by: ['categoryName'],
      where: { cityId, isResolved: true, categoryName: { not: null }, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { categoryName: 'desc' } },
      take: 8,
    });
    const openNow = cards
      .filter((c) => c.open.status === 'open')
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating.score - a.rating.score)
      .slice(0, 10);
    return { success: true, countsByType: byType, popular: popular.map((p) => p.categoryName), openNow };
  });

  fastify.get('/public/categories', async () => {
    const cityId = await getPublicCityId();
    const cats = await db.category.findMany({
      select: { id: true, name: true, emoji: true, objectType: true, group: true, _count: { select: { listings: { where: { cityId, ...ACTIVE } } } } },
      orderBy: { name: 'asc' },
    });
    return cats.filter((c) => c._count.listings > 0).map((c) => ({ ...c, count: c._count.listings, _count: undefined }));
  });

  fastify.get('/public/landmarks', async () => {
    const cityId = await getPublicCityId();
    return db.landmark.findMany({ where: { cityId }, select: { id: true, name: true, latitude: true, longitude: true, boundary: true }, orderBy: { name: 'asc' } });
  });

  // Ro'yxat bo'yicha ko'rish (kategoriya / hudud / tur / hozir ochiq)
  fastify.get('/public/listings', async (req: any) => {
    const cityId = await getPublicCityId();
    const q = req.query || {};
    const where: any = { cityId, ...ACTIVE };
    if (q.categoryId) where.categoryId = String(q.categoryId);
    if (q.type) where.type = String(q.type);
    if (q.landmarkId) {
      const id = String(q.landmarkId);
      where.OR = [{ primaryLandmarkId: id }, { serviceAreaLandmarks: { some: { id } } }];
    }
    if (q.badge) where.badges = { has: String(q.badge) };
    const rows = await db.listing.findMany({ where, select: PUBLIC_LISTING_SELECT, take: 200 });
    let cards = rows.map(toPublicCard);
    if (q.openNow === '1') cards = cards.filter((c) => c.open.status === 'open');
    cards.sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating.score - a.rating.score);
    return { success: true, items: cards };
  });

  // Aqlli qidiruv — bot bilan bir xil pipeline. Ishonchli moslik
  // bo'lmasa bo'sh qaytadi (taxmin ko'rsatilmaydi).
  fastify.get('/public/search', async (req: any) => {
    const cityId = await getPublicCityId();
    const text = String(req.query?.q || '').trim().slice(0, 300);
    if (text.length < 2) return { success: true, items: [], understood: null };
    const started = Date.now();
    const tgId: bigint = req.publicUser.telegramId;

    const dispatcher = await findLocalDispatcherMatch(text, cityId);
    if (dispatcher) {
      return { success: true, items: [], service: { label: dispatcher.label, phone: dispatcher.phoneNumber }, understood: null };
    }

    const cls = await classifyQuery(text, cityId, tgId);
    cls.landmark = sanitizeAiLandmarkName(cls.landmark);
    const understood = { category: cls.category, landmark: cls.landmark, intent: cls.intent };
    if (cls.intent === IntentType.EMERGENCY) return { success: true, items: [], emergency: true, understood };
    if (isNonSearchMessage(text)) return { success: true, items: [], understood };

    const result = await searchListings(buildSearchParams(cityId, text, cls));
    db.queryLog
      .create({
        data: {
          cityId,
          telegramUserId: tgId,
          rawMessage: text,
          intent: cls.intent,
          categoryName: cls.category,
          landmarkName: cls.landmark,
          isResolved: !!result,
          confidence: cls.confidence,
          aiSource: cls.source ?? null,
          responseTimeMs: Date.now() - started,
        },
      })
      .catch(() => {});
    if (!result) return { success: true, items: [], understood };

    const ids = [result.listingId, ...result.otherMatches.map((m) => m.listingId)];
    const rows = await db.listing.findMany({ where: { id: { in: ids } }, select: PUBLIC_LISTING_SELECT });
    const byId = new Map(rows.map((r) => [r.id, toPublicCard(r)]));
    const items = ids.map((id) => byId.get(id)).filter(Boolean);
    // 1-o'rin — asosiy (tekshirilgan) javob; qolganlari "Ehtimol bular ham".
    return { success: true, items, primaryCount: 1, verifiedBy: result.verifiedBy || 'not_needed', understood };
  });

  fastify.get('/public/listings/:id', async (req: any, reply) => {
    const cityId = await getPublicCityId();
    const l = await db.listing.findFirst({ where: { id: req.params.id, cityId, ...ACTIVE }, select: PUBLIC_LISTING_SELECT });
    if (!l) return reply.code(404).send({ success: false });
    const tgId: bigint = req.publicUser.telegramId;
    const [reviews, fav, revealed] = await Promise.all([
      db.review.findMany({
        where: { listingId: l.id, comment: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { isPositive: true, comment: true, createdAt: true },
      }),
      db.favorite.findUnique({ where: { telegramUserId_listingId: { telegramUserId: tgId, listingId: l.id } } }),
      db.phoneReveal.findFirst({ where: { telegramUserId: tgId, listingId: l.id } }),
    ]);
    return { success: true, listing: toPublicCard(l), reviews, isFavorite: !!fav, canReview: !!revealed };
  });

  // Telefon raqami: obuna + limit (bazani ko'chirib olishdan himoya)
  fastify.post('/public/listings/:id/phone', async (req: any, reply) => {
    const cityId = await getPublicCityId();
    const tgId: bigint = req.publicUser.telegramId;
    const missing = await getMissingChannelsForUser(tgId);
    if (missing.length > 0) return reply.code(403).send({ success: false, reason: 'subscribe', missing });

    const already = await db.phoneReveal.findFirst({ where: { telegramUserId: tgId, listingId: req.params.id } });
    if (!already) {
      const [hour, day] = await Promise.all([
        db.phoneReveal.count({ where: { telegramUserId: tgId, createdAt: { gte: new Date(Date.now() - 3600_000) } } }),
        db.phoneReveal.count({ where: { telegramUserId: tgId, createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
      ]);
      if (hour >= PHONE_LIMIT_PER_HOUR || day >= PHONE_LIMIT_PER_DAY) {
        return reply.code(429).send({ success: false, reason: 'limit', message: "Juda ko'p so'rov. Birozdan keyin urinib ko'ring." });
      }
    }
    const l = await db.listing.findFirst({ where: { id: req.params.id, cityId, ...ACTIVE }, select: { id: true, phone: true } });
    if (!l) return reply.code(404).send({ success: false });
    if (!already) await db.phoneReveal.create({ data: { telegramUserId: tgId, listingId: l.id } });
    return { success: true, phone: l.phone };
  });

  // Saqlanganlar
  fastify.get('/public/favorites', async (req: any) => {
    const favs = await db.favorite.findMany({
      where: { telegramUserId: req.publicUser.telegramId, listing: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      select: { listing: { select: PUBLIC_LISTING_SELECT } },
    });
    return { success: true, items: favs.map((f) => toPublicCard(f.listing)) };
  });
  fastify.post('/public/favorites/:id', async (req: any) => {
    const key = { telegramUserId: req.publicUser.telegramId, listingId: req.params.id };
    await db.favorite.upsert({ where: { telegramUserId_listingId: key }, create: key, update: {} });
    return { success: true };
  });
  fastify.delete('/public/favorites/:id', async (req: any) => {
    await db.favorite.deleteMany({ where: { telegramUserId: req.publicUser.telegramId, listingId: req.params.id } });
    return { success: true };
  });

  // Baholash (TZ: 👍/👎). Faqat raqamni ochgan odam, bitta yozuvga bitta
  // baho (qayta baholasa — yangilanadi), so'kinish filtri.
  fastify.post('/public/listings/:id/review', async (req: any, reply) => {
    const tgId: bigint = req.publicUser.telegramId;
    const isPositive = req.body?.isPositive === true;
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim().slice(0, 500) : '';
    const revealed = await db.phoneReveal.findFirst({ where: { telegramUserId: tgId, listingId: req.params.id } });
    if (!revealed) return reply.code(403).send({ success: false, message: "Baho berish uchun avval bog'laning" });
    if (comment && containsProfanity(comment)) return reply.code(400).send({ success: false, message: "Izohda nojo'ya so'z bor" });
    const existing = await db.review.findFirst({ where: { listingId: req.params.id, telegramUserId: tgId } });
    const data = { isPositive, comment: comment || null };
    if (existing) await db.review.update({ where: { id: existing.id }, data });
    else await db.review.create({ data: { ...data, listingId: req.params.id, telegramUserId: tgId } });
    return { success: true };
  });

  // "Ma'lumot noto'g'ri" — admin paneldagi mavjud tuzatishlar navbatiga
  fastify.post('/public/listings/:id/report', async (req: any, reply) => {
    const cityId = await getPublicCityId();
    const reason = String(req.body?.reason || '').slice(0, 60);
    const comment = String(req.body?.comment || '').slice(0, 500);
    if (!reason) return reply.code(400).send({ success: false });
    const today = await db.correction.count({
      where: { telegramUserId: req.publicUser.telegramId, createdAt: { gte: new Date(Date.now() - 86400_000) } },
    });
    if (today >= 10) return reply.code(429).send({ success: false });
    await db.correction.create({
      data: { cityId, listingId: req.params.id, telegramUserId: req.publicUser.telegramId, message: `[${reason}] ${comment}`.trim() },
    });
    return { success: true };
  });

  // "Bu men so'ragan narsa emas" — false positive nomzodi
  fastify.post('/public/search-feedback', async (req: any) => {
    const cityId = await getPublicCityId();
    const query = String(req.body?.query || '').slice(0, 300);
    if (!query) return { success: false };
    await db.searchFeedback.create({
      data: { cityId, telegramUserId: req.publicUser.telegramId, query, listingId: req.body?.listingId ? String(req.body.listingId) : null },
    });
    return { success: true };
  });

  // Ma'lumot qo'shish — admin "Nomzodlar" navbatiga
  fastify.post('/public/candidates', async (req: any, reply) => {
    const cityId = await getPublicCityId();
    const tgId: bigint = req.publicUser.telegramId;
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 120);
    const phone = String(b.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
    if (!name || phone.replace(/\D/g, '').length < 9) return reply.code(400).send({ success: false, message: 'Nom va telefon kerak' });
    const today = await db.candidate.count({ where: { submittedBy: tgId.toString(), createdAt: { gte: new Date(Date.now() - 86400_000) } } });
    if (today >= CANDIDATE_LIMIT_PER_DAY) return reply.code(429).send({ success: false, message: 'Bugungi limit tugadi' });
    await db.candidate.create({
      data: {
        cityId,
        name,
        phone,
        categoryId: b.categoryId ? String(b.categoryId) : null,
        primaryLandmarkId: b.landmarkId ? String(b.landmarkId) : null,
        workFrom: b.workFrom ? String(b.workFrom).slice(0, 5) : null,
        workTo: b.workTo ? String(b.workTo).slice(0, 5) : null,
        badges: [],
        source: 'webapp',
        submittedBy: tgId.toString(),
      },
    });
    return { success: true };
  });

  fastify.get('/public/me/candidates', async (req: any) => {
    const items = await db.candidate.findMany({
      where: { submittedBy: req.publicUser.telegramId.toString(), source: 'webapp' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, name: true, status: true, createdAt: true, category: { select: { name: true, emoji: true } } },
    });
    return { success: true, items };
  });

  // SOS — favqulodda raqamlar (shablonlar kodda, o'zgarmaydi)
  fastify.get('/public/emergency', async () => {
    const cityId = await getPublicCityId();
    const local = await getCoreEmergencyNumbers(cityId);
    return {
      success: true,
      national: [
        { key: 'fire', label: "Yong'in xizmati", phone: '101' },
        { key: 'police', label: 'Militsiya', phone: '102' },
        { key: 'ambulance', label: 'Tez yordam', phone: '103' },
        { key: 'gas', label: 'Gaz avariya xizmati', phone: '104' },
        { key: 'unified', label: 'Yagona qutqaruv xizmati', phone: '112' },
      ],
      local: CORE_EMERGENCY_KEYS.map((k) => ({ key: k.key, label: k.label, phone: local[k.templateVar] || null })).filter((x) => x.phone),
    };
  });
}
