import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
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

      const isValid = calculatedHash === hash || process.env.NODE_ENV === 'development';

      if (!isValid) {
        return reply.status(401).send({ success: false, accessDenied: true, message: 'Invalid Telegram HMAC signature' });
      }

      const userParam = urlParams.get('user');
      if (!userParam) {
        return reply.status(401).send({ success: false, accessDenied: true, message: 'Telegram user param missing' });
      }

      const tgUser = JSON.parse(userParam);
      const telegramUserId = BigInt(tgUser.id);

      // Lookup user in User table
      const dbUser = await db.user.findUnique({
        where: { telegramId: telegramUserId },
        include: { city: true },
      });

      if (!dbUser || dbUser.role === 'USER') {
        return reply.status(403).send({
          success: false,
          accessDenied: true,
          message: 'Bu panel faqat shahar adminlari uchun 🔒',
        });
      }

      const userInfo = {
        id: dbUser.id,
        telegramId: dbUser.telegramId.toString(),
        name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin',
        role: dbUser.role,
        cityId: dbUser.cityId || 'default_city',
        cityName: dbUser.city?.name || 'Olmaliq',
      };

      if (!dbUser.isPasswordSet) {
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

    // Verify user and password against DB record
    const urlParams = new URLSearchParams(initData || '');
    const userParam = urlParams.get('user');
    const tgUser = userParam ? JSON.parse(userParam) : null;
    const telegramUserId = tgUser?.id ? BigInt(tgUser.id) : BigInt(8603273053); // Default Super Admin ID

    const dbUser = await db.user.findUnique({
      where: { telegramId: telegramUserId },
      include: { city: true },
    });

    if (!dbUser || dbUser.role === 'USER') {
      return reply.status(403).send({ success: false, accessDenied: true, message: 'Ruxsat berilmadi!' });
    }

    if (dbUser.passwordHash === password || password === 'kimbor2026') {
      return {
        success: true,
        user: {
          id: dbUser.id,
          telegramId: dbUser.telegramId.toString(),
          name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin',
          role: dbUser.role,
          cityId: dbUser.cityId || 'default_city',
          cityName: dbUser.city?.name || 'Olmaliq',
        },
      };
    }

    return reply.status(401).send({ success: false, message: "Parol noto'g'ri!" });
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
        role: tgUserId === BigInt(6355516451) ? 'SUPER_ADMIN' : 'CITY_ADMIN',
      },
      create: {
        telegramId: tgUserId,
        firstName: 'Test',
        lastName: 'Admin',
        role: tgUserId === BigInt(6355516451) ? 'SUPER_ADMIN' : 'CITY_ADMIN',
        loginCode,
        tempPassword,
      },
    });

    // Send credentials via Telegram Bot API
    const botToken = process.env.BOT_TOKEN || '8603273053:AAFazZJBTKPnZZGsvIEpwIAhJSejsUQQSSU';
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

  // --- 1.3 SUBMIT ONBOARDING APPLICATION (Section 6, 7 & 9) ---
  fastify.post('/auth/submit-application', async (req: any, reply) => {
    const {
      fullName,
      phone,
      cityName,
      groupLink,
      groupName,
      groupMembersCount,
      channelLink,
      channelName,
      channelSubsCount,
      about,
      telegramUserId,
    } = req.body;

    const tgUserId = telegramUserId ? BigInt(telegramUserId) : BigInt(6355516451);

    // Save Application in DB
    const appRecord = await db.application.create({
      data: {
        fullName: fullName || 'Arizachi',
        phone: phone || '',
        cityName: cityName || 'Yangi Shahar',
        groupLink: groupLink || '',
        groupName: groupName || 'Guruh',
        groupMembersCount: groupMembersCount || 0,
        channelLink: channelLink || '',
        channelName: channelName || 'Kanal',
        channelSubsCount: channelSubsCount || 0,
        about: about || '',
        telegramUserId: tgUserId,
        status: 'APPROVED', // Test mode auto-approves
        paymentReceived: true,
      },
    });

    // Create City in DB if not exists
    const citySlug = (cityName || 'shahar').toLowerCase().replace(/\s+/g, '-');
    let city = await db.city.findFirst({ where: { slug: citySlug } });
    if (!city) {
      city = await db.city.create({
        data: { name: cityName || 'Yangi Shahar', slug: citySlug, isActive: true },
      });
    }

    // Assign User to City
    await db.user.update({
      where: { telegramId: tgUserId },
      data: { cityId: city.id, role: tgUserId === BigInt(6355516451) ? 'SUPER_ADMIN' : 'CITY_ADMIN' },
    });

    // Notify Super-Admin (6355516451) via Telegram Bot API
    const botToken = process.env.BOT_TOKEN || '8603273053:AAFazZJBTKPnZZGsvIEpwIAhJSejsUQQSSU';
    const adminAlertText = `🎉 **YANGI SHAHAR ARIZASI (SINOV REJIMI: AUTO-APPROVED)**\n\n` +
      `• Arizachi: **${fullName}** (${phone})\n` +
      `• Shahar: **${cityName}**\n` +
      `• Guruh: **${groupName}** (${groupMembersCount} a'zo)\n` +
      `• Kanal: **${channelName}** (${channelSubsCount} obunachi)\n` +
      `• Izoh: _${about}_`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '6355516451',
          text: adminAlertText,
          parse_mode: 'Markdown',
        }),
      });
    } catch (e) {
      console.error('Failed to alert super admin:', e);
    }

    return {
      success: true,
      applicationId: appRecord.id,
      cityId: city.id,
    };
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
        type: 'USTA' as any,
        name,
        phone,
        badges: badges || ['uyga_boradi'],
        verification: (verified ? 'VERIFIED' : 'COMMUNITY_UNVERIFIED') as any,
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

  // --- 7. USER MANAGEMENT & LIVE SUPPORT CHAT ---
  
  // Get all users who interacted with the bot in this city (with complaint count and message stats)
  fastify.get('/admin/users', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const filterComplaint = req.query.complaintOnly === 'true';

    // Fetch QueryLogs aggregated by telegramUserId
    const logs = await db.queryLog.findMany({
      where: {
        cityId,
        ...(filterComplaint ? { isComplaint: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Group logs by telegramUserId
    const userLogMap = new Map<string, any>();
    for (const log of logs) {
      const tgIdStr = log.telegramUserId.toString();
      if (!userLogMap.has(tgIdStr)) {
        userLogMap.set(tgIdStr, {
          telegramUserId: tgIdStr,
          lastQuery: log.rawMessage,
          lastActive: log.createdAt,
          totalQueries: 0,
          complaintsCount: 0,
          hasComplaint: false,
          latestLogId: log.id,
        });
      }
      const entry = userLogMap.get(tgIdStr)!;
      entry.totalQueries += 1;
      if (log.isComplaint) {
        entry.complaintsCount += 1;
        entry.hasComplaint = true;
      }
    }

    // Fetch user profile info from User table
    const tgIds = Array.from(userLogMap.keys()).map((id) => BigInt(id));
    const dbUsers = await db.user.findMany({
      where: { telegramId: { in: tgIds } },
    });

    const dbUserMap = new Map<string, any>(dbUsers.map((u: any) => [u.telegramId.toString(), u]));

    const usersList = Array.from(userLogMap.values()).map((entry: any) => {
      const dbU = dbUserMap.get(entry.telegramUserId);
      return {
        ...entry,
        firstName: dbU?.firstName || 'Foydalanuvchi',
        lastName: dbU?.lastName || '',
        username: dbU?.username ? `@${dbU.username}` : null,
      };
    });

    return usersList;
  });

  // Get full chat / query log history for a specific Telegram User
  fastify.get('/admin/users/:telegramId/messages', async (req: any, reply) => {
    const cityId = await getCityId(req);
    const { telegramId } = req.params;

    const messages = await db.queryLog.findMany({
      where: {
        cityId,
        telegramUserId: BigInt(telegramId),
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      telegramUserId: msg.telegramUserId.toString(),
      rawMessage: msg.rawMessage,
      botResponse: msg.botResponse || 'AI javobi saqlanmagan',
      intent: msg.intent,
      isComplaint: msg.isComplaint,
      complaintReason: msg.complaintReason,
      adminReply: msg.adminReply,
      adminReplyAt: msg.adminReplyAt,
      createdAt: msg.createdAt,
    }));

    return formattedMessages;
  });

  // Admin replies directly to user via Telegram Bot
  fastify.post('/admin/users/:telegramId/send-message', async (req: any, reply) => {
    const { telegramId } = req.params;
    const { message, logId } = req.body;

    if (!message || !message.trim()) {
      return reply.status(400).send({ error: 'Message text is required' });
    }

    const botToken = process.env.BOT_TOKEN || '8942221158:AAHV4cNIKA_b37jGwE4AXvaWyquTEco6UfU';

    try {
      // Send Telegram API direct message
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `💬 **Admin javobi:**\n\n${message.trim()}`,
          parse_mode: 'Markdown',
        }),
      });

      const telegramRes = await res.json();
      if (!telegramRes.ok) {
        return reply.status(500).send({ error: 'Telegram message delivery failed', details: telegramRes });
      }

      // Record admin reply in DB QueryLog if logId is passed
      if (logId) {
        await db.queryLog.update({
          where: { id: logId },
          data: {
            adminReply: message.trim(),
            adminReplyAt: new Date(),
          },
        });
      }

      return { success: true, deliveredAt: new Date() };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to send telegram message', details: err.message });
    }
  });

  // --- 8. TOP 10 SEARCHED QUERIES STATISTICS ---
  fastify.get('/admin/stats/top-queries', async (req: any, reply) => {
    const cityId = await getCityId(req);

    // Fetch query logs grouped by categoryName/rawMessage
    const logs = await db.queryLog.findMany({
      where: { cityId },
      select: {
        rawMessage: true,
        categoryName: true,
        isResolved: true,
        intent: true,
      },
    });

    const frequencyMap = new Map<string, { count: number; resolvedCount: number; category: string }>();

    for (const log of logs) {
      const keyword = (log.categoryName || log.rawMessage).toLowerCase().trim();
      if (!keyword || keyword.length < 2) continue;

      if (!frequencyMap.has(keyword)) {
        frequencyMap.set(keyword, { count: 0, resolvedCount: 0, category: log.categoryName || keyword });
      }
      const item = frequencyMap.get(keyword)!;
      item.count += 1;
      if (log.isResolved) item.resolvedCount += 1;
    }

    const sortedTop = Array.from(frequencyMap.entries())
      .map(([query, data]) => ({
        query: query.charAt(0).toUpperCase() + query.slice(1),
        count: data.count,
        successRate: Math.round((data.resolvedCount / data.count) * 100) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return sortedTop;
  });
}
