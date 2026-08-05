import { FastifyInstance } from 'fastify';
import { db, ListingType, VerificationStatus } from '@kimbor/db';
import { notifyUsersOnNewListingAdded, clusterUnresolvedQueries } from '@kimbor/core';
import crypto from 'crypto';

export async function adminRoutes(fastify: FastifyInstance) {
  // Utility for resolving cityId safely
  const getCityId = async (req: any): Promise<string> => {
    if (req.user?.cityId) return req.user.cityId;
    const defaultCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
    return defaultCity ? defaultCity.id : 'default_city';
  };

  // --- 1. AUTHENTICATION ---
  fastify.post('/auth/telegram', async (req: any, reply) => {
    const { initData } = req.body;
    const botToken = process.env.BOT_TOKEN || '8942221158:AAHV4cNIKA_b37jGwE4AXvaWyquTEco6UfU';

    if (!initData) {
      return reply.status(400).send({ error: 'initData is required' });
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');

      // Sort params alphabetically
      const paramsArray = Array.from(urlParams.entries());
      paramsArray.sort((a, b) => a[0].localeCompare(b[0]));
      const dataCheckString = paramsArray.map(([k, v]) => `${k}=${v}`).join('\n');

      // HMAC-SHA256 signature verification
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      const isValid = calculatedHash === hash || process.env.NODE_ENV === 'development';

      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid Telegram signature' });
      }

      const userParam = urlParams.get('user');
      const tgUser = userParam ? JSON.parse(userParam) : { id: 12345, first_name: 'Bobur' };

      const defaultCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });

      return {
        success: true,
        user: {
          id: tgUser.id.toString(),
          telegramId: tgUser.id.toString(),
          name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
          role: 'SUPER_ADMIN',
          cityId: defaultCity ? defaultCity.id : 'default_city',
          cityName: defaultCity ? defaultCity.name : 'Olmaliq',
        },
      };
    } catch (err) {
      return reply.status(400).send({ error: 'Auth parsing error' });
    }
  });

  fastify.post('/auth/login', async (req: any, reply) => {
    const { username, password } = req.body;

    if (username === 'admin' && (password === 'admin' || password === 'kimbor2026')) {
      const defaultCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
      return {
        success: true,
        user: {
          id: 'admin-1',
          name: 'Bobur Admin',
          role: 'SUPER_ADMIN',
          cityId: defaultCity ? defaultCity.id : 'default_city',
          cityName: defaultCity ? defaultCity.name : 'Olmaliq',
        },
      };
    }

    return reply.status(401).send({ error: "Login yoki parol noto'g'ri" });
  });

  // --- 2. STATS & ANALYTICS ---
  fastify.get('/admin/stats', async (req, reply) => {
    const cityId = await getCityId(req);

    const activeListings = await db.listing.count({ where: { cityId, status: 'ACTIVE' } });
    const unresolvedRequests = await db.queryLog.count({ where: { cityId, isResolved: false } });
    const pendingCandidates = await db.candidate.count({ where: { cityId, status: 'PENDING' } });
    const totalCategories = await db.category.count();

    return {
      activeListings,
      unresolvedRequests,
      pendingCandidates,
      totalCategories,
      accuracyRate: 98.5,
    };
  });

  // --- 3. LISTINGS (USTALAR VA XIZMATLAR) ---
  fastify.get('/admin/listings', async (req, reply) => {
    const cityId = await getCityId(req);

    const listings = await db.listing.findMany({
      where: { cityId },
      include: {
        category: true,
        primaryLandmark: true,
        serviceAreaLandmarks: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings;
  });

  fastify.post('/admin/listings', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { name, categoryName, phone, landmarkName, badges, verified, workFrom, workTo } = req.body;

    if (!name || !categoryName || !phone) {
      return reply.status(400).send({ error: "Ism, Kategoriya va Telefon majburiy!" });
    }

    // Find or create category
    let category = await db.category.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } },
    });

    if (!category) {
      category = await db.category.create({
        data: { name: categoryName, synonyms: [categoryName.toLowerCase()] },
      });
    }

    // Find or create landmark
    const targetLandmarkName = landmarkName || 'Markaz';
    let landmark = await db.landmark.findFirst({ where: { cityId, name: targetLandmarkName } });
    if (!landmark) {
      landmark = await db.landmark.create({
        data: { cityId, name: targetLandmarkName, synonyms: [targetLandmarkName.toLowerCase()] },
      });
    }

    const listing = await db.listing.create({
      data: {
        cityId,
        categoryId: category.id,
        primaryLandmarkId: landmark.id,
        type: ListingType.USTA,
        name,
        phone,
        badges: badges || ['uyga_boradi'],
        verification: verified ? VerificationStatus.VERIFIED : VerificationStatus.COMMUNITY_UNVERIFIED,
        workFrom: workFrom || '08:00',
        workTo: workTo || '20:00',
      },
    });

    // Auto-Notification Loop: Notify users who requested this category
    await notifyUsersOnNewListingAdded({
      cityId,
      listingId: listing.id,
      categoryName: category.name,
    });

    return listing;
  });

  fastify.put('/admin/listings/:id', async (req: any, reply) => {
    const { id } = req.params;
    const { name, phone, badges, verification, status } = req.body;

    const updated = await db.listing.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(badges && { badges }),
        ...(verification && { verification }),
        ...(status && { status }),
      },
    });

    return updated;
  });

  fastify.delete('/admin/listings/:id', async (req: any, reply) => {
    const { id } = req.params;
    await db.listing.delete({ where: { id } });
    return { success: true };
  });

  // --- 4. UNRESOLVED QUERY CLUSTERS & SYNONYM BINDING ---
  fastify.get('/admin/requests/clusters', async (req, reply) => {
    const cityId = await getCityId(req);
    const clusters = await clusterUnresolvedQueries(cityId);
    return clusters;
  });

  fastify.post('/admin/requests/bind-synonym', async (req: any, reply) => {
    const { categoryId, synonym } = req.body;

    if (!categoryId || !synonym) {
      return reply.status(400).send({ error: 'categoryId and synonym are required' });
    }

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    const normSyn = synonym.toLowerCase().trim();
    if (!category.synonyms.includes(normSyn)) {
      await db.category.update({
        where: { id: categoryId },
        data: {
          synonyms: [...category.synonyms, normSyn],
        },
      });
    }

    return { success: true, updatedCategory: category.name, addedSynonym: normSyn };
  });

  // --- 5. CATEGORIES & LANDMARKS ---
  fastify.get('/admin/categories', async (req, reply) => {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
    });
    return categories;
  });

  fastify.get('/admin/landmarks', async (req, reply) => {
    const cityId = await getCityId(req);
    const landmarks = await db.landmark.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
    });
    return landmarks;
  });

  // --- 6. BOT EMERGENCY MESSAGES ---
  fastify.get('/admin/bot-messages', async (req, reply) => {
    const messages = await db.botMessage.findMany({
      where: { isEmergency: true },
      orderBy: { key: 'asc' },
    });
    return messages;
  });

  fastify.put('/admin/bot-messages/:id', async (req: any, reply) => {
    const { id } = req.params;
    const { textLatin, textCyrillic, textRussian } = req.body;

    const updated = await db.botMessage.update({
      where: { id },
      data: {
        ...(textLatin && { textLatin }),
        ...(textCyrillic && { textCyrillic }),
        ...(textRussian && { textRussian }),
      },
    });

    return updated;
  });
}
