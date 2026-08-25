import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
import { hashPassword, authenticateRequest } from './authSecurity';

/**
 * Helper: Audit log yozish
 */
async function writeAuditLog(
  userId: string | null,
  cityId: string | null,
  action: string,
  details: Record<string, unknown>,
  req: any,
) {
  const ua = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
  try {
    await db.auditLog.create({
      data: {
        userId: userId || undefined,
        cityId: cityId || undefined,
        action,
        details: details as any,
        deviceInfo: ua.slice(0, 255),
        ipAddress: ip.slice(0, 64),
      },
    });
  } catch {
    // audit log yozilmasa ham asosiy amal to'xtamasin
  }
}

/**
 * Helper: Resolve current user from req securely
 */
async function resolveUser(req: any): Promise<any> {
  const { user } = await authenticateRequest(req);
  return user;
}

/**
 * Helper: Super-admin tekshirish
 */
async function requireSuperAdmin(req: any, reply: any): Promise<boolean> {
  const { user, error } = await authenticateRequest(req);
  if (error) {
    reply.status(error.status).send(error.body);
    return false;
  }
  if (user.role !== 'SUPER_ADMIN') {
    reply.status(403).send({ success: false, message: 'Faqat Super-Admin uchun 🔒' });
    return false;
  }
  return true;
}

/**
 * Helper: Moderator rol tekshirish (MODERATOR_EDITOR yoki MODERATOR_APPROVER)
 */
async function requireModerator(req: any, reply: any): Promise<boolean> {
  const { user, error } = await authenticateRequest(req);
  if (error) {
    reply.status(error.status).send(error.body);
    return false;
  }
  if (user.role === 'USER') {
    reply.status(403).send({ success: false, message: 'Ruxsat yo\'q 🔒' });
    return false;
  }
  return true;
}

export async function moderatorRoutes(fastify: FastifyInstance) {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. MODERATOR YARATISH  POST /admin/moderators
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/admin/moderators', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const { firstName, lastName, phoneNumber, telegramId, role } = req.body as {
      firstName: string;
      lastName?: string;
      phoneNumber: string;
      telegramId: string;
      role?: string;
    };

    if (!firstName || !phoneNumber || !telegramId) {
      return reply.status(400).send({ success: false, message: 'firstName, phoneNumber, telegramId majburiy' });
    }

    const allowedRoles = ['MODERATOR_EDITOR', 'MODERATOR_APPROVER', 'MODERATOR_VIEWER'];
    const assignedRole = allowedRoles.includes(role || '') ? role : 'MODERATOR_EDITOR';

    // Login kodi: 6 raqam
    const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Parol: 8 ta harf
    const rawPassword = Math.random().toString(36).slice(2, 10);
    const passwordHash = hashPassword(rawPassword);

    const cityId = req.user?.cityId || (await db.city.findFirst({ where: { slug: 'olmaliq' } }))?.id;

    try {
      const newMod = await db.user.create({
        data: {
          telegramId: BigInt(telegramId),
          firstName,
          lastName: lastName || '',
          phoneNumber,
          role: assignedRole as any,
          cityId: cityId || undefined,
          isPasswordSet: true,
          passwordHash,
          loginCode,
          addedBy: req.user?.id,
        },
      });

      await writeAuditLog(req.user?.id, cityId || null, 'CREATE_MODERATOR', {
        moderatorId: newMod.id,
        firstName,
        role: assignedRole,
      }, req);

      return {
        success: true,
        moderator: {
          id: newMod.id,
          firstName: newMod.firstName,
          lastName: newMod.lastName,
          phoneNumber: newMod.phoneNumber,
          role: newMod.role,
          loginCode,
          tempPassword: rawPassword, // Bir marta ko'rsatiladi
        },
      };
    } catch (err: any) {
      if (err.code === 'P2002') {
        return reply.status(409).send({ success: false, message: 'Bu Telegram ID allaqachon ro\'yxatda' });
      }
      throw err;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. MODERATORLAR RO'YXATI  GET /admin/moderators
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/admin/moderators', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const cityId = req.user?.cityId;

    const mods = await db.user.findMany({
      where: {
        cityId: cityId || undefined,
        role: { in: ['MODERATOR_EDITOR', 'MODERATOR_APPROVER', 'MODERATOR_VIEWER'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        username: true,
        role: true,
        isSuspended: true,
        suspendedAt: true,
        createdAt: true,
        _count: { select: { addedListings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      moderators: mods.map(m => ({
        ...m,
        addedCount: m._count.addedListings,
        telegramId: undefined, // Xavfsizlik: telegramId ni qaytarmaymiz
      })),
    };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. HISOBNI TO'XTATISH / TIKLASH  PUT /admin/moderators/:id/suspend
  // ──────────────────────────────────────────────────────────────────────────
  fastify.put('/admin/moderators/:id/suspend', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const { id } = req.params as { id: string };
    const { suspend } = req.body as { suspend: boolean };

    const mod = await db.user.findUnique({ where: { id } });
    if (!mod) return reply.status(404).send({ success: false, message: 'Moderator topilmadi' });

    const updated = await db.user.update({
      where: { id },
      data: {
        isSuspended: suspend,
        suspendedAt: suspend ? new Date() : null,
      },
    });

    await writeAuditLog(req.user?.id, mod.cityId, suspend ? 'SUSPEND_MODERATOR' : 'RESTORE_MODERATOR', {
      targetId: id,
      targetName: `${mod.firstName} ${mod.lastName}`,
    }, req);

    return { success: true, isSuspended: updated.isSuspended };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. MODERATORNI O'CHIRISH  DELETE /admin/moderators/:id
  // Yozuvlar bazada qoladi. Sessiyalar yopiladi (role=USER ga tushadi).
  // ──────────────────────────────────────────────────────────────────────────
  fastify.delete('/admin/moderators/:id', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const { id } = req.params as { id: string };

    const mod = await db.user.findUnique({ where: { id } });
    if (!mod) return reply.status(404).send({ success: false, message: 'Moderator topilmadi' });

    // Rolni USER ga tushirib, accountni "faolsizlashtirish"
    // Yozuvlar (addedListings) addedByUserId orqali saqlanib qoladi
    await db.user.update({
      where: { id },
      data: {
        role: 'USER' as any,
        isSuspended: true,
        suspendedAt: new Date(),
        passwordHash: null,
        isPasswordSet: false,
        loginCode: null,
      },
    });

    await writeAuditLog(req.user?.id, mod.cityId, 'DELETE_MODERATOR', {
      targetId: id,
      targetName: `${mod.firstName} ${mod.lastName}`,
    }, req);

    return { success: true, message: 'Moderator o\'chirildi. Uning qo\'shgan yozuvlari saqlab qolindi.' };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. KIM NECHTA QO'SHDI  GET /admin/contributions
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/admin/contributions', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const cityId = req.user?.cityId || (await db.city.findFirst({ where: { slug: 'olmaliq' } }))?.id;

    const results = await db.user.findMany({
      where: {
        cityId: cityId || undefined,
        role: { in: ['MODERATOR_EDITOR', 'MODERATOR_APPROVER', 'MODERATOR_VIEWER'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isSuspended: true,
        _count: { select: { addedListings: true } },
      },
      orderBy: { addedListings: { _count: 'desc' } },
    });

    const maxCount = results.reduce((m, r) => Math.max(m, r._count.addedListings), 0) || 1;

    return {
      success: true,
      contributions: results.map(r => ({
        id: r.id,
        name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
        count: r._count.addedListings,
        barWidth: Math.round((r._count.addedListings / maxCount) * 10), // 0-10
        isSuspended: r.isSuspended,
      })),
    };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. KUNLIK TEKSHIRISH  GET /admin/daily-checks
  // Bugungi 5 ta tasodifiy yozuv (Super-Admin ko'radi)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/admin/daily-checks', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const cityId = req.user?.cityId || (await db.city.findFirst({ where: { slug: 'olmaliq' } }))?.id;
    if (!cityId) return reply.status(400).send({ success: false, message: 'cityId topilmadi' });

    const today = new Date().toISOString().slice(0, 10); // "2026-08-13"

    // Bugungi tekshiruvlar allaqachon yaratilganmi?
    const existing = await db.dailyCheck.findMany({
      where: { cityId, checkDate: today },
      include: {
        listing: { select: { id: true, name: true, phone: true, categoryId: true, verification: true } },
      },
    });

    if (existing.length > 0) {
      return { success: true, checks: existing, today };
    }

    // Agar yo'q bo'lsa — 5 ta tasodifiy ACTIVE listing tanlash
    const count = await db.listing.count({ where: { cityId, status: 'ACTIVE' } });
    const skip = Math.max(0, Math.floor(Math.random() * Math.max(count - 5, 1)));

    const listings = await db.listing.findMany({
      where: { cityId, status: 'ACTIVE' },
      skip,
      take: 5,
      select: { id: true },
    });

    if (listings.length === 0) {
      return { success: true, checks: [], today };
    }

    // DailyCheck yozuvlari yaratish
    await db.dailyCheck.createMany({
      data: listings.map(l => ({
        cityId,
        listingId: l.id,
        checkDate: today,
      })),
      skipDuplicates: true,
    });

    const checks = await db.dailyCheck.findMany({
      where: { cityId, checkDate: today },
      include: {
        listing: { select: { id: true, name: true, phone: true, categoryId: true, verification: true } },
      },
    });

    return { success: true, checks, today };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. TEKSHIRDIM ✓  POST /admin/daily-checks/:id/verify
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/admin/daily-checks/:id/verify', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const { id } = req.params as { id: string };

    const check = await db.dailyCheck.findUnique({ where: { id } });
    if (!check) return reply.status(404).send({ success: false, message: 'Tekshiruv topilmadi' });

    const updated = await db.dailyCheck.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        checkedBy: req.user?.id,
      },
    });

    // Listing'ni VERIFIED holatga o'tkazish
    await db.listing.update({
      where: { id: check.listingId },
      data: {
        verification: 'VERIFIED',
        lastVerifiedAt: new Date(),
      },
    });

    await writeAuditLog(req.user?.id, check.cityId, 'VERIFY_LISTING', {
      listingId: check.listingId,
      dailyCheckId: id,
    }, req);

    return { success: true, check: updated };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. JURNAL  GET /admin/audit-logs
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get('/admin/audit-logs', async (req: any, reply) => {
    if (!await requireSuperAdmin(req, reply)) return;

    const cityId = req.user?.cityId;
    const { limit = '50', offset = '0' } = req.query as { limit?: string; offset?: string };

    const logs = await db.auditLog.findMany({
      where: { cityId: cityId || undefined },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    return {
      success: true,
      logs: logs.map(l => ({
        id: l.id,
        action: l.action,
        details: l.details,
        deviceInfo: l.deviceInfo,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
        by: l.user ? `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() : 'Noma\'lum',
        role: l.user?.role,
      })),
    };
  });
}
