import { FastifyInstance } from 'fastify';
import { db, ListingType, VerificationStatus } from '@kimbor/db';
import { notifyUsersOnNewListingAdded, clusterUnresolvedQueries, resolveCanonicalCategoryName, stripLandmarkSuffixes } from '@kimbor/core';
import crypto from 'crypto';
import { verifyTelegramInitData, verifyPassword, hashPassword, authenticateRequest } from './authSecurity';

// Login bloklanish muddatini o'qishga qulay shaklga o'tkazadi (masalan "2 kun 5 soat")
function formatRemainingTime(until: Date): string {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return 'bir necha soniya';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days} kun ${hours} soat`;
  if (hours > 0) return `${hours} soat`;
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${minutes} daqiqa`;
}

export async function adminRoutes(fastify: FastifyInstance) {
  const SUPER_ADMIN_IDS = [BigInt(6355516451), BigInt(8323651390), BigInt(5369180248)];
  const isSuperAdminId = (id?: bigint | null) => (id ? SUPER_ADMIN_IDS.some((a) => a === id) : false);

  // Utility for resolving cityId safely
  // - Haqiqiy autentifikatsiya orqali o'ziga tegishli cityId ishlatadi
  // - Sessiya topilmasa (masalan initData yo'q), Olmaliqqa tushadi (yagona shahar)
  const getCityId = async (req: any): Promise<string> => {
    const { user } = await authenticateRequest(req);
    if (user) {
      req.user = user;
      if (user.cityId) return user.cityId;
    }
    const defaultCity = await db.city.findFirst({ where: { slug: 'olmaliq' } });
    return defaultCity ? defaultCity.id : 'default_city';
  };

  // --- 1. AUTHENTICATION ---
  fastify.post('/auth/telegram', async (req: any, reply) => {
    const { initData } = req.body;
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return reply.status(500).send({ success: false, message: 'BOT_TOKEN env variable is not configured' });

    if (!initData) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'initData required' });
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

      const isValid = calculatedHash === hash;

      if (!isValid) {
        return reply.status(401).send({ success: false, accessDenied: true, message: 'Invalid Telegram HMAC signature' });
      }

      const userParam = urlParams.get('user');
      if (!userParam) {
        return reply.status(401).send({ success: false, accessDenied: true, message: 'Telegram user param missing' });
      }

      const tgUser = JSON.parse(userParam);
      const telegramUserId = BigInt(tgUser.id);

      // Lookup user in User table (agar mavjud bo'lmasa yoki oddiy USER bo'lsa ham
      // bloklanmaydi — parolning o'zi haqiqiy himoya, kirish urinishi shu yerda rad
      // etilmaydi, faqat /auth/login bosqichida parol tekshiriladi)
      const dbUser = await db.user.findUnique({
        where: { telegramId: telegramUserId },
        include: { city: true },
      });

      const userInfo = dbUser
        ? {
            id: dbUser.id,
            telegramId: dbUser.telegramId.toString(),
            name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin',
            role: dbUser.role,
            cityId: dbUser.cityId || 'default_city',
            cityName: dbUser.city?.name || 'Olmaliq',
          }
        : {
            id: '',
            telegramId: telegramUserId.toString(),
            name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Admin',
            role: 'USER',
            cityId: 'default_city',
            cityName: 'Olmaliq',
          };

      // Ko'p marta xato parol kiritilgan bo'lsa — parol ekranini ko'rsatishdan
      // oldin ham bloklanganini bildiramiz (foydalanuvchi behuda urinmasin)
      const loginAttempt = await db.loginAttempt.findUnique({ where: { telegramId: telegramUserId } });
      if (loginAttempt?.bannedUntil && loginAttempt.bannedUntil > new Date()) {
        return {
          success: true,
          banned: true,
          bannedMessage: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(loginAttempt.bannedUntil)} keyin qayta urining.`,
          user: userInfo,
        };
      }

      // Faqat oldindan taklif qilingan (moderator) va hali parol qo'ymagan
      // foydalanuvchi "parol o'rnatish" ekraniga yo'naltiriladi. Qolgan barcha
      // holatda — oddiy parol kirish ekrani ko'rsatiladi.
      if (dbUser && dbUser.role !== 'USER' && !dbUser.isPasswordSet) {
        return {
          success: true,
          requiresSetup: true,
          user: userInfo,
        };
      }

      return {
        success: true,
        requiresPassword: true,
        user: userInfo,
      };
    } catch (err) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'Auth parsing error' });
    }
  });

  fastify.post('/auth/login', async (req: any, reply) => {
    const { initData, password } = req.body;

    if (!initData || !password) {
      return reply.status(400).send({ success: false, message: 'initData va parol talab qilinadi' });
    }

    const { isValid, telegramId, userRaw } = verifyTelegramInitData(initData);
    if (!isValid || !telegramId) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'Telegram imzo (HMAC) xatosi 🔒' });
    }

    // 0. Brute-force himoyasi: 5 marta xato parol kiritilsa, 3 kunga bloklanadi.
    const existingAttempt = await db.loginAttempt.findUnique({ where: { telegramId } });
    if (existingAttempt?.bannedUntil && existingAttempt.bannedUntil > new Date()) {
      return reply.status(403).send({
        success: false,
        banned: true,
        message: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(existingAttempt.bannedUntil)} keyin qayta urining.`,
      });
    }

    // 1. Yagona admin paroli (.env: ADMIN_PASSWORD) — to'g'ri kiritilsa, shu Telegram
    // foydalanuvchisi to'liq admin huquqi bilan yoziladi/yangilanadi.
    const adminPassword = process.env.ADMIN_PASSWORD;
    let resultUser: any = null;

    if (adminPassword && password === adminPassword) {
      const olmaliq = await db.city.findFirst({ where: { slug: 'olmaliq' } });
      const dbUser = await db.user.upsert({
        where: { telegramId },
        update: { role: 'SUPER_ADMIN', isSuspended: false },
        create: {
          telegramId,
          firstName: userRaw?.first_name || 'Admin',
          lastName: userRaw?.last_name || '',
          username: userRaw?.username || null,
          role: 'SUPER_ADMIN',
          cityId: olmaliq?.id,
          isPasswordSet: true,
        },
        include: { city: true },
      });
      resultUser = dbUser;
    } else {
      // 2. Oldindan tayinlangan (masalan moderator) shaxsiy paroli
      const dbUser = await db.user.findUnique({ where: { telegramId }, include: { city: true } });
      if (dbUser && dbUser.role !== 'USER' && !dbUser.isSuspended && dbUser.passwordHash && verifyPassword(password, dbUser.passwordHash)) {
        resultUser = dbUser;
      }
    }

    if (resultUser) {
      // To'g'ri parol — oldingi xato urinishlar hisobi tozalanadi
      if (existingAttempt) {
        await db.loginAttempt.delete({ where: { telegramId } }).catch(() => {});
      }
      return {
        success: true,
        user: {
          id: resultUser.id,
          telegramId: resultUser.telegramId.toString(),
          name: `${resultUser.firstName || ''} ${resultUser.lastName || ''}`.trim() || 'Admin',
          role: resultUser.role,
          cityId: resultUser.cityId || 'default_city',
          cityName: resultUser.city?.name || 'Olmaliq',
        },
      };
    }

    // Xato parol — urinishlar sonini oshiramiz, 5 taga yetsa 3 kunga bloklaymiz
    const newFailedCount = (existingAttempt?.failedCount || 0) + 1;
    const shouldBan = newFailedCount >= 5;
    const bannedUntil = shouldBan ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null;

    await db.loginAttempt.upsert({
      where: { telegramId },
      update: { failedCount: shouldBan ? 0 : newFailedCount, bannedUntil, lastAttemptAt: new Date() },
      create: { telegramId, failedCount: shouldBan ? 0 : newFailedCount, bannedUntil },
    });

    if (shouldBan) {
      return reply.status(403).send({
        success: false,
        banned: true,
        message: `Ko'p marta xato parol kiritildi. ${formatRemainingTime(bannedUntil!)} keyin qayta urining.`,
      });
    }

    return reply.status(401).send({ success: false, message: "Parol noto'g'ri!" });
  });

  fastify.post('/auth/setup-password', async (req: any, reply) => {
    const { initData, password } = req.body;
    if (!initData || !password || password.length < 6) {
      return reply.status(400).send({ success: false, message: "Parol kamida 6 belgidan iborat bo'lishi kerak" });
    }

    const { isValid, telegramId } = verifyTelegramInitData(initData);
    if (!isValid || !telegramId) {
      return reply.status(401).send({ success: false, accessDenied: true, message: 'Telegram imzo (HMAC) xatosi 🔒' });
    }

    const dbUser = await db.user.findUnique({ where: { telegramId } });
    if (!dbUser || dbUser.role === 'USER' || dbUser.isSuspended) {
      return reply.status(403).send({ success: false, accessDenied: true, message: 'Ruxsat berilmadi! 🔒' });
    }

    const passwordHash = hashPassword(password);
    await db.user.update({
      where: { telegramId },
      data: {
        passwordHash,
        isPasswordSet: true,
      },
    });

    return { success: true, message: "Parol o'rnatildi!" };
  });

  // --- 1.2 TEST CHECKOUT & CREDENTIAL GENERATION (Section 2 & 3) ---
  fastify.post('/auth/test-checkout', async (req: any, reply) => {
    const { planType, telegramUserId } = req.body;
    const tgUserId = telegramUserId ? BigInt(telegramUserId) : BigInt(6355516451);

    // Generate 6-digit login code and 6-letter password
    const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
    const charset = 'abcdefghjkmnpqrstuvwxy';
    let tempPassword = '';
    for (let i = 0; i < 6; i++) {
      tempPassword += charset[Math.floor(Math.random() * charset.length)];
    }

    // Upsert Admin User in DB
    const dbUser = await db.user.upsert({
      where: { telegramId: tgUserId },
      update: {
        loginCode,
        tempPassword,
        role: isSuperAdminId(tgUserId) ? 'SUPER_ADMIN' : 'CITY_ADMIN',
      },
      create: {
        telegramId: tgUserId,
        firstName: 'Test',
        lastName: 'Admin',
        role: isSuperAdminId(tgUserId) ? 'SUPER_ADMIN' : 'CITY_ADMIN',
        loginCode,
        tempPassword,
      },
    });

    // Send credentials via Telegram Bot API
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error('BOT_TOKEN env variable is not configured');
    const appUrl = process.env.WEBAPP_URL || 'https://7d0905ff78ad33.lhr.life';

    const credMessage = `✅ **To'lov qabul qilindi**\n\n` +
      `Kirish ma'lumotlaringiz:\n` +
      `**Login**: \`${loginCode}\`\n` +
      `**Parol**: \`${tempPassword}\`\n\n` +
      `Bu ma'lumotlarni saqlab qo'ying.`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUserId.toString(),
          text: credMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🔐 Panelga kirish', url: appUrl }]],
          },
        }),
      });
    } catch (e) {
      console.error('Failed to send Telegram credentials message:', e);
    }

    return {
      success: true,
      credentials: { loginCode, tempPassword },
    };
  });

  // --- 2. STATS & ANALYTICS ---
  fastify.get('/admin/stats', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { period } = req.query || {};

    let periodStart: Date | undefined;
    if (period === 'today') {
      periodStart = new Date();
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    const periodFilter = periodStart ? { createdAt: { gte: periodStart } } : {};

    const activeListings = await db.listing.count({ where: { cityId, status: 'ACTIVE' } });
    const totalQuestions = await db.queryLog.count({ where: { cityId, ...periodFilter } });
    const unresolvedRequests = await db.queryLog.count({ where: { cityId, isResolved: false, ...periodFilter } });
    const pendingCandidates = await db.candidate.count({ where: { cityId, status: 'PENDING' } });
    const totalCategories = await db.category.count();
    const totalUsers = await db.user.count({ where: { cityId } });

    // Javob % — haqiqiy hisob: (jami savol - javobsiz) / jami savol
    const resolvedPercent = totalQuestions > 0
      ? Math.round(((totalQuestions - unresolvedRequests) / totalQuestions) * 1000) / 10
      : 100;

    return {
      // DashboardScreen.tsx kutgan nomlar:
      totalQuestions,
      unresolvedRequests,
      resolvedPercent,
      totalListings: activeListings,
      totalUsers,
      // Qo'shimcha (boshqa ekranlar uchun):
      activeListings,
      pendingCandidates,
      totalCategories,
      accuracyRate: resolvedPercent,
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

  // GET /admin/listings/check-duplicate
  fastify.get('/admin/listings/check-duplicate', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { phone, name } = req.query as { phone?: string; name?: string };

    if (!phone && !name) {
      return { isDuplicate: false };
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    
    // Find matching listing by phone or name in this city
    const existingListings = await db.listing.findMany({
      where: {
        cityId,
        status: 'ACTIVE',
      },
      include: {
        category: true,
        primaryLandmark: true,
      },
    });

    const match = existingListings.find((item) => {
      const itemCleanPhone = item.phone ? item.phone.replace(/\D/g, '') : '';
      if (cleanPhone && cleanPhone.length >= 7 && itemCleanPhone.endsWith(cleanPhone.slice(-7))) {
        return true;
      }
      if (name && name.length >= 3 && item.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        return true;
      }
      return false;
    });

    if (match) {
      return {
        isDuplicate: true,
        existing: {
          id: match.id,
          name: match.name,
          categoryName: match.category.name,
          landmarkName: match.primaryLandmark.name,
          phone: match.phone,
        },
      };
    }

    return { isDuplicate: false };
  });

  fastify.post('/admin/listings', async (req: any, reply) => {
    try {
      const cityId = await getCityId(req);
      const {
        type,
        name,
        categoryName,
        phone,
        landmarkName,
        badges,
        verified,
        workFrom,
        workTo,
        addedByUserId,
        consentGiven,
        consentDevice,
        latitude,
        longitude,
        jargonSynonyms,
        isConfirmedDifferent,
      } = req.body;

      if (!name || !categoryName || !phone) {
        return reply.status(400).send({ error: "Ism, Kategoriya va Telefon majburiy!" });
      }

      const VALID_LISTING_TYPES = [ListingType.USTA, ListingType.DOKON_OBYEKT, ListingType.MUASSASA, ListingType.TRANSPORT, ListingType.ARENDA];
      const listingType = VALID_LISTING_TYPES.includes(type) ? type : ListingType.USTA;

      // Find or create category. Avval kiritilgan nomni lug'atdagi KANONIK
      // nomga moslashtiramiz (masalan "taxi", "Taxi" -> "Taksi") — shu orqali
      // yozilish farqi sabab dublikat kategoriya yaralishining oldi olinadi.
      const canonicalCategoryName = resolveCanonicalCategoryName(categoryName);
      let category = await db.category.findFirst({
        where: { name: { equals: canonicalCategoryName, mode: 'insensitive' } },
      });

      if (!category) {
        category = await db.category.create({
          data: { name: canonicalCategoryName, synonyms: [canonicalCategoryName.toLowerCase()] },
        });
      }

      // Find or create landmark. Nom saqlashdan oldin "yonida", "orqasida" kabi
      // qo'shimchalar olib tashlanadi (stripLandmarkSuffixes) — aks holda
      // qidiruvda foydalanuvchi xabaridan xuddi shu qo'shimchalar olib
      // tashlanib solishtirilgani uchun ("Vadakanal yonida" -> "vadakanal")
      // to'liq nom ("Vadakanal yonidagi") bilan mos kelmay qolar edi.
      const rawLandmarkInput = landmarkName || 'Markaz';
      const targetLandmarkName = stripLandmarkSuffixes(rawLandmarkInput) || rawLandmarkInput;
      let landmark = await db.landmark.findFirst({
        where: { cityId, name: { equals: targetLandmarkName, mode: 'insensitive' } },
      });
      if (!landmark) {
        landmark = await db.landmark.create({
          data: {
            cityId,
            name: targetLandmarkName,
            synonyms: Array.from(new Set([targetLandmarkName.toLowerCase(), rawLandmarkInput.toLowerCase()])),
          },
        });
      }

      const ip = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();

      const listing = await db.listing.create({
        data: {
          cityId,
          categoryId: category.id,
          primaryLandmarkId: landmark.id,
          type: listingType,
          name,
          phone,
          badges: badges || ['uyga_boradi'],
          verification: verified ? VerificationStatus.VERIFIED : VerificationStatus.COMMUNITY_UNVERIFIED,
          workFrom: workFrom || '08:00',
          workTo: workTo || '20:00',
          addedByUserId: req.user?.id || addedByUserId || null,
          consentGiven: Boolean(consentGiven),
          consentAt: consentGiven ? new Date() : null,
          consentDevice: consentDevice || req.headers['user-agent'] || null,
          consentIp: ip || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          jargonSynonyms: Array.isArray(jargonSynonyms) ? jargonSynonyms : [],
        },
      });

      // Write Audit Log for requirement #8 JURNAL
      try {
        await db.auditLog.create({
          data: {
            userId: req.user?.id || addedByUserId || null,
            cityId,
            action: 'CREATE_LISTING',
            details: { listingId: listing.id, name, phone, consentGiven: Boolean(consentGiven), isConfirmedDifferent: Boolean(isConfirmedDifferent) },
            deviceInfo: (consentDevice || req.headers['user-agent'] || '').slice(0, 255),
            ipAddress: ip.slice(0, 64),
          },
        });
      } catch {}

      // Auto-Notification Loop: Notify users who requested this category
      await notifyUsersOnNewListingAdded({
        cityId,
        listingId: listing.id,
        categoryName: category.name,
      });

      return listing;
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({
        error: "Yozuvni saqlashda xatolik yuz berdi. Iltimos qayta urinib ko'ring.",
      });
    }
  });

  // GET /admin/listings/:id — Full detail with category, landmark, reviews, corrections, history
  fastify.get('/admin/listings/:id', async (req: any, reply) => {
    const { id } = req.params;
    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        category: true,
        primaryLandmark: true,
        serviceAreaLandmarks: true,
        reviews: { orderBy: { createdAt: 'desc' } },
        corrections: { orderBy: { createdAt: 'desc' } },
        history: { orderBy: { createdAt: 'desc' }, take: 20 },
        addedByUser: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    if (!listing) return reply.status(404).send({ success: false, message: 'Yozuv topilmadi' });

    // Format bot preview message
    const botPreviewText = [
      `🔧 ${listing.category?.name || 'Xizmat'}`,
      '',
      `${listing.name} ${listing.verification === 'VERIFIED' ? '✅' : '⚠️'} ⭐${listing.bayesianRating.toFixed(1)}`,
      `📍 ${listing.primaryLandmark?.name || 'Olmaliq'}`,
      `🏷 ${(listing.badges || []).join(' · ')}`,
      `📞 ${listing.phone}`,
      '',
      `[Yana 2 tasini ko'rish]`,
      '',
      `🕐 Bu xabar 15 daqiqada o'chadi`,
    ].join('\n');

    return {
      success: true,
      listing,
      botPreviewText,
    };
  });

  fastify.put('/admin/listings/:id', async (req: any, reply) => {
    const { id } = req.params;
    const {
      name,
      phone,
      badges,
      verification,
      status,
      categoryName,
      landmarkName,
      workFrom,
      workTo,
      specificServices,
      approxPrice,
      description,
      jargonSynonyms,
    } = req.body;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Yozuv topilmadi' });

    // Record snapshot before updating
    try {
      await db.listingHistory.create({
        data: {
          listingId: id,
          changedBy: req.user?.id || 'Admin',
          snapshot: existing as any,
        },
      });
    } catch {}

    // Category / Landmark updates
    let categoryId = existing.categoryId;
    if (categoryName) {
      const canonicalName = resolveCanonicalCategoryName(categoryName);
      let cat = await db.category.findFirst({ where: { name: { equals: canonicalName, mode: 'insensitive' } } });
      if (!cat) cat = await db.category.create({ data: { name: canonicalName, synonyms: [canonicalName.toLowerCase()] } });
      categoryId = cat.id;
    }

    let primaryLandmarkId = existing.primaryLandmarkId;
    if (landmarkName) {
      const cleanLandmarkName = stripLandmarkSuffixes(landmarkName) || landmarkName;
      let lm = await db.landmark.findFirst({
        where: { cityId: existing.cityId, name: { equals: cleanLandmarkName, mode: 'insensitive' } },
      });
      if (!lm) {
        lm = await db.landmark.create({
          data: {
            cityId: existing.cityId,
            name: cleanLandmarkName,
            synonyms: Array.from(new Set([cleanLandmarkName.toLowerCase(), landmarkName.toLowerCase()])),
          },
        });
      }
      primaryLandmarkId = lm.id;
    }

    const updated = await db.listing.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(badges && { badges }),
        ...(verification && { verification }),
        ...(status && { status }),
        ...(workFrom && { workFrom }),
        ...(workTo && { workTo }),
        ...(specificServices !== undefined && { specificServices }),
        ...(approxPrice !== undefined && { approxPrice }),
        ...(description !== undefined && { description }),
        ...(Array.isArray(jargonSynonyms) && { jargonSynonyms }),
        categoryId,
        primaryLandmarkId,
        lastVerifiedAt: new Date(),
      },
      include: {
        category: true,
        primaryLandmark: true,
      },
    });

    return { success: true, listing: updated };
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
  fastify.get('/admin/categories', async (req: any, reply) => {
    const { search, objectType } = req.query as { search?: string; objectType?: string };

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { synonyms: { has: search.toLowerCase() } },
      ];
    }
    if (objectType) {
      whereClause.objectType = objectType;
    }

    const categories = await db.category.findMany({
      where: whereClause,
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { listings: true } },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      synonyms: c.synonyms,
      group: c.group,
      objectType: c.objectType,
      count: c._count.listings,
    }));
  });

  // Mavjud guruh nomlari ro'yxati — "Kategoriya qo'shish" formasida tanlash uchun
  fastify.get('/admin/categories/groups', async (req, reply) => {
    const rows = await db.category.findMany({
      where: { group: { not: null } },
      distinct: ['group'],
      select: { group: true },
      orderBy: { group: 'asc' },
    });
    return rows.map((r) => r.group).filter(Boolean);
  });

  fastify.get('/admin/categories/:id', async (req: any, reply) => {
    const { id } = req.params;
    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { listings: true } } },
    });
    if (!category) return reply.status(404).send({ success: false, message: 'Kategoriya topilmadi' });
    return {
      id: category.id,
      name: category.name,
      synonyms: category.synonyms,
      group: category.group,
      objectType: category.objectType,
      count: category._count.listings,
    };
  });

  fastify.post('/admin/categories', async (req: any, reply) => {
    const { name, objectType, group, synonyms } = req.body;

    if (!name || !name.trim()) {
      return reply.status(400).send({ success: false, message: 'Kategoriya nomi majburiy' });
    }

    const existing = await db.category.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } });
    if (existing) {
      return reply.status(409).send({ success: false, message: 'Bu nomdagi kategoriya allaqachon mavjud' });
    }

    const VALID_OBJECT_TYPES = ['USTA', 'DOKON_OBYEKT', 'MUASSASA', 'TRANSPORT', 'ARENDA'];
    const category = await db.category.create({
      data: {
        name: name.trim(),
        objectType: VALID_OBJECT_TYPES.includes(objectType) ? objectType : null,
        group: group && group.trim() ? group.trim() : null,
        synonyms: Array.isArray(synonyms) ? synonyms.map((s: string) => s.toLowerCase().trim()).filter(Boolean) : [],
      },
    });

    return { success: true, category };
  });

  fastify.put('/admin/categories/:id', async (req: any, reply) => {
    const { id } = req.params;
    const { name, synonyms, objectType, group } = req.body;

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ success: false, message: 'Kategoriya topilmadi' });

    const VALID_OBJECT_TYPES = ['USTA', 'DOKON_OBYEKT', 'MUASSASA', 'TRANSPORT', 'ARENDA'];
    const updated = await db.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(Array.isArray(synonyms) && { synonyms: synonyms.map((s: string) => s.toLowerCase().trim()).filter(Boolean) }),
        ...(objectType !== undefined && { objectType: VALID_OBJECT_TYPES.includes(objectType) ? objectType : null }),
        ...(group !== undefined && { group: group && group.trim() ? group.trim() : null }),
      },
    });

    return { success: true, category: updated };
  });

  fastify.get('/admin/landmarks', async (req, reply) => {
    const cityId = await getCityId(req);
    const landmarks = await db.landmark.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
    });
    return landmarks;
  });

  // Bot qaysi guruh/kanallarda ishlayotganini ko'rsatadi — botni yangi
  // guruhga admin qilib qo'shsangiz, qo'shimcha sozlashsiz shu yerda
  // avtomatik ko'rinadi (Telegram bot.on('my_chat_member') orqali yoziladi).
  fastify.get('/admin/groups', async (req, reply) => {
    const groups = await db.cityGroup.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return groups.map((g) => ({
      id: g.id,
      chatId: g.chatId.toString(),
      title: g.title || 'Nomsiz guruh',
      createdAt: g.createdAt,
    }));
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

  // --- 7. DIRECT CHATS & SUHBATLAR ---
  fastify.get('/admin/chats', async (req: any, reply) => {
    const users = await db.user.findMany({
      where: { role: 'USER' },
      orderBy: { createdAt: 'desc' },
    });

    const chats = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await db.chatMessage.findFirst({
          where: { telegramUserId: user.telegramId },
          orderBy: { createdAt: 'desc' },
        });
        return {
          id: user.id,
          telegramId: user.telegramId.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber,
          lastMessageText: lastMessage ? lastMessage.text : 'Suhbat boshlanmagan',
          lastMessageTime: lastMessage ? lastMessage.createdAt : user.createdAt,
        };
      })
    );

    chats.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    return chats;
  });

  fastify.get('/admin/users', async (req: any, reply) => {
    const { search, filter } = req.query as { search?: string; filter?: string };

    const whereClause: any = {
      role: 'USER',
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filter === 'new') {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: fortyEightHoursAgo };
    }

    let users = await db.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    let result = await Promise.all(
      users.map(async (user) => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const queryCountToday = await db.queryLog.count({
          where: {
            telegramUserId: user.telegramId,
            createdAt: { gte: todayStart },
          },
        });

        const hasComplaints = await db.chatMessage.count({
          where: {
            telegramUserId: user.telegramId,
            isComplaint: true,
          },
        }) > 0;

        const lastMsg = await db.chatMessage.findFirst({
          where: { telegramUserId: user.telegramId },
          orderBy: { createdAt: 'desc' },
        });

        const lastActivity = lastMsg ? lastMsg.createdAt : user.createdAt;

        return {
          id: user.id,
          telegramId: user.telegramId.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber,
          queryCountToday,
          hasComplaints,
          lastActivity,
          lastMessageText: lastMsg ? lastMsg.text : null,
        };
      })
    );

    if (filter === 'active') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      result = result.filter(u => new Date(u.lastActivity) >= twentyFourHoursAgo);
    }

    if (filter === 'complained') {
      result = result.filter(u => u.hasComplaints);
    }

    result.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    return result;
  });


  fastify.get('/admin/chats/:telegramUserId/messages', async (req: any, reply) => {
    const { telegramUserId } = req.params;
    const messages = await db.chatMessage.findMany({
      where: { telegramUserId: BigInt(telegramUserId) },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => ({
      id: m.id,
      telegramUserId: m.telegramUserId.toString(),
      senderType: m.senderType,
      text: m.text,
      isComplaint: m.isComplaint,
      createdAt: m.createdAt,
    }));
  });

  fastify.post('/admin/chats/:telegramUserId/messages', async (req: any, reply) => {
    const { telegramUserId } = req.params;
    const { text } = req.body;
    if (!text) return reply.status(400).send({ success: false, message: 'Message text is required' });

    const tgUserId = BigInt(telegramUserId);
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return reply.status(500).send({ success: false, message: 'BOT_TOKEN is not configured' });

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUserId.toString(),
          text: text,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('Failed to send Telegram message:', body);
        return reply.status(502).send({ success: false, message: 'Failed to send message via Telegram Bot', error: body });
      }
    } catch (err) {
      console.error('Telegram API error:', err);
      return reply.status(500).send({ success: false, message: 'Telegram API call failed', error: err });
    }

    const m = await db.chatMessage.create({
      data: {
        telegramUserId: tgUserId,
        senderType: 'ADMIN',
        text: text,
      },
    });

    return {
      success: true,
      message: {
        id: m.id,
        telegramUserId: m.telegramUserId.toString(),
        senderType: m.senderType,
        text: m.text,
        createdAt: m.createdAt,
      },
    };
  });

  fastify.post('/admin/users/:telegramUserId/reply', async (req: any, reply) => {
    const { telegramUserId } = req.params;
    const { text } = req.body;
    if (!text) return reply.status(400).send({ success: false, message: 'Message text is required' });

    const tgUserId = BigInt(telegramUserId);
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return reply.status(500).send({ success: false, message: 'BOT_TOKEN is not configured' });

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUserId.toString(),
          text: text,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('Failed to send Telegram message:', body);
        return reply.status(502).send({ success: false, message: 'Failed to send message via Telegram Bot', error: body });
      }
    } catch (err) {
      console.error('Telegram API error:', err);
      return reply.status(500).send({ success: false, message: 'Telegram API call failed', error: err });
    }

    const m = await db.chatMessage.create({
      data: {
        telegramUserId: tgUserId,
        senderType: 'ADMIN',
        text: text,
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: req.user?.id || null,
          cityId: req.user?.cityId || null,
          action: 'REPLY_TO_USER',
          details: {
            telegramUserId: telegramUserId,
            messageText: text,
          },
        },
      });
    } catch (auditErr) {
      console.error('Failed to log audit:', auditErr);
    }

    return {
      success: true,
      message: {
        id: m.id,
        telegramUserId: m.telegramUserId.toString(),
        senderType: m.senderType,
        text: m.text,
        createdAt: m.createdAt,
      },
    };
  });


  fastify.get('/admin/complaints', async (req: any, reply) => {
    const complaints = await db.chatMessage.findMany({
      where: { isComplaint: true },
      orderBy: { createdAt: 'desc' },
    });

    const resolvedComplaints = await Promise.all(
      complaints.map(async (c) => {
        const user = await db.user.findUnique({
          where: { telegramId: c.telegramUserId },
        });
        return {
          id: c.id,
          telegramUserId: c.telegramUserId.toString(),
          text: c.text,
          createdAt: c.createdAt,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
          } : null,
        };
      })
    );

    return resolvedComplaints;
  });

  fastify.get('/admin/queries/top-10', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const result = await db.queryLog.groupBy({
      by: ['rawMessage'],
      where: {
        cityId,
        rawMessage: { not: '' },
      },
      _count: {
        rawMessage: true,
      },
      orderBy: {
        _count: {
          rawMessage: 'desc',
        },
      },
      take: 10,
    });

    return result.map((r) => ({
      query: r.rawMessage,
      count: r._count.rawMessage,
    }));
  });
}

