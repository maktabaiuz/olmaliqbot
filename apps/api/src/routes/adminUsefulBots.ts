import { FastifyInstance } from 'fastify';
import { db } from '@kimbor/db';
import { USEFUL_BOTS } from '@kimbor/core';
import { requireSuperAdmin } from './adminRoutes';

/**
 * "Foydali botlar" (2026-10-13 qayta qurilgan): umumiy ko'rinish, har bir bot
 * sahifasi (guruhlar, botning guruhdagi huquqlari, 7 kunlik statistika) va
 * "Majburiy taklif" boshqaruvi (kutayotganlar, kim kimni qo'shgani, qo'lda
 * ruxsat, hammasini ochish). Sozlamalarni saqlash — mavjud
 * PUT /admin/useful-bots/:key/groups/:groupId orqali.
 */

const DAY = 86400_000;

// Har bir bot uchun botga guruhda qaysi huquq kerak
const NEEDS: Record<string, ('delete' | 'restrict' | 'invite')[]> = {
  PROFANITY: ['delete', 'restrict'],
  SPAM_LINK: ['delete'],
  GAMBLING: ['delete'],
  SCAM: ['delete'],
  FLOOD: ['delete', 'restrict'],
  MANDATORY_INVITE: ['delete', 'invite'],
};

type Health = { isAdmin: boolean; canDelete: boolean; canRestrict: boolean; canInvite: boolean; memberCount: number | null; error?: string };
const healthCache = new Map<string, { v: Health; exp: number }>();

async function groupHealth(chatId: bigint): Promise<Health> {
  const k = chatId.toString();
  const c = healthCache.get(k);
  if (c && c.exp > Date.now()) return c.v;
  const token = process.env.BOT_TOKEN;
  const botId = token?.split(':')[0];
  let v: Health = { isAdmin: false, canDelete: false, canRestrict: false, canInvite: false, memberCount: null };
  try {
    const [m, cnt] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${k}&user_id=${botId}`).then((r) => r.json()),
      fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${k}`).then((r) => r.json()),
    ]);
    const r: any = m?.result;
    if (!m?.ok) v.error = m?.description || 'Telegram javob bermadi';
    else {
      v.isAdmin = r.status === 'administrator' || r.status === 'creator';
      v.canDelete = r.status === 'creator' || !!r.can_delete_messages;
      v.canRestrict = r.status === 'creator' || !!r.can_restrict_members;
      v.canInvite = r.status === 'creator' || !!r.can_invite_users;
    }
    if (cnt?.ok) v.memberCount = cnt.result;
  } catch {
    v.error = "Telegram'ga ulanib bo'lmadi";
  }
  healthCache.set(k, { v, exp: Date.now() + 60_000 });
  return v;
}

function missingRights(key: string, h: Health): string[] {
  if (!h.isAdmin) return ['Bot admin emas'];
  const out: string[] = [];
  for (const need of NEEDS[key] || []) {
    if (need === 'delete' && !h.canDelete) out.push("Xabar o'chirish huquqi yo'q");
    if (need === 'restrict' && !h.canRestrict) out.push("Jim qilish huquqi yo'q");
    if (need === 'invite' && !h.canInvite) out.push("Taklif havolasi yaratish huquqi yo'q");
  }
  return out;
}

export async function adminUsefulBots(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req: any, reply) => {
    if (!(await requireSuperAdmin(req, reply))) return reply;
  });

  // ---------- Umumiy ko'rinish ----------
  fastify.get('/admin/useful-bots/overview', async () => {
    const since = new Date(Date.now() - 7 * DAY);
    const [toggles, logs, credits, waiting, groupsTotal] = await Promise.all([
      db.groupFeatureToggle.groupBy({ by: ['featureKey'], where: { isEnabled: true }, _count: { _all: true } }),
      db.moderationLog.groupBy({ by: ['category'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      db.groupInviteCredit.count({ where: { createdAt: { gte: since }, revokedAt: null } }),
      db.groupInviteProgress.count({ where: { isVerified: false } }),
      db.cityGroup.count(),
    ]);
    const en = Object.fromEntries(toggles.map((t) => [t.featureKey, t._count._all]));
    const act = Object.fromEntries(logs.map((l) => [l.category, l._count._all]));
    return {
      success: true,
      groupsTotal,
      bots: USEFUL_BOTS.map((b) => ({
        ...b,
        enabledGroupCount: en[b.key] || 0,
        actions7d: b.key === 'MANDATORY_INVITE' ? credits : act[b.key] || 0,
        waiting: b.key === 'MANDATORY_INVITE' ? waiting : undefined,
      })),
    };
  });

  // ---------- Bitta bot sahifasi ----------
  fastify.get('/admin/useful-bots/:key/detail', async (req: any, reply) => {
    const key = String(req.params.key);
    const bot = USEFUL_BOTS.find((b) => b.key === key);
    if (!bot) return reply.code(404).send({ success: false, message: 'Bot topilmadi' });
    const since = new Date(Date.now() - 7 * DAY);
    const [groups, toggles, logs, domains] = await Promise.all([
      db.cityGroup.findMany({ orderBy: { createdAt: 'asc' } }),
      db.groupFeatureToggle.findMany({ where: { featureKey: key } }),
      key === 'MANDATORY_INVITE'
        ? Promise.resolve([] as { chatId: bigint; _count: { _all: number } }[])
        : db.moderationLog.groupBy({ by: ['chatId'], where: { category: key, createdAt: { gte: since } }, _count: { _all: true } }),
      key === 'SPAM_LINK' ? db.allowedDomain.findMany({ orderBy: { createdAt: 'desc' } }) : Promise.resolve([] as any[]),
    ]);
    const tByGroup = new Map(toggles.map((t) => [t.cityGroupId, t]));
    const logsByChat = new Map(logs.map((l) => [l.chatId.toString(), l._count._all]));

    let invite: Map<string, { waiting: number; verified: number; credits7d: number }> = new Map();
    if (key === 'MANDATORY_INVITE') {
      const [w, v, c] = await Promise.all([
        db.groupInviteProgress.groupBy({ by: ['cityGroupId'], where: { isVerified: false }, _count: { _all: true } }),
        db.groupInviteProgress.groupBy({ by: ['cityGroupId'], where: { isVerified: true }, _count: { _all: true } }),
        db.groupInviteCredit.groupBy({ by: ['cityGroupId'], where: { createdAt: { gte: since }, revokedAt: null }, _count: { _all: true } }),
      ]);
      const m = (rows: { cityGroupId: string; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.cityGroupId, r._count._all]));
      const [wm, vm, cm] = [m(w), m(v), m(c)];
      invite = new Map(groups.map((g) => [g.id, { waiting: wm.get(g.id) || 0, verified: vm.get(g.id) || 0, credits7d: cm.get(g.id) || 0 }]));
    }

    const items = await Promise.all(
      groups.map(async (g) => {
        const t = tByGroup.get(g.id);
        const h = await groupHealth(g.chatId);
        return {
          id: g.id,
          chatId: g.chatId.toString(),
          title: g.title || 'Nomsiz guruh',
          isEnabled: !!t?.isEnabled,
          requiredCount: t?.requiredCount ?? null,
          linkLabel: t?.linkLabel ?? null,
          linkButtonStyle: t?.linkButtonStyle ?? null,
          linkUrl: t?.linkUrl ?? null,
          memberCount: h.memberCount,
          problems: missingRights(key, h),
          actions7d: logsByChat.get(g.chatId.toString()) || 0,
          invite: invite.get(g.id) || null,
          domains: key === 'SPAM_LINK' ? domains.filter((d: any) => d.cityGroupId === g.id).map((d: any) => ({ id: d.id, domain: d.domain })) : undefined,
        };
      })
    );
    return { success: true, bot, groups: items };
  });

  // ---------- Majburiy taklif: guruh tafsiloti ----------
  fastify.get('/admin/useful-bots/invite/:groupId', async (req: any, reply) => {
    const g = await db.cityGroup.findUnique({ where: { id: req.params.groupId } });
    if (!g) return reply.code(404).send({ success: false });
    const t = await db.groupFeatureToggle.findUnique({ where: { cityGroupId_featureKey: { cityGroupId: g.id, featureKey: 'MANDATORY_INVITE' } } });
    const [waiting, credits] = await Promise.all([
      db.groupInviteProgress.findMany({ where: { cityGroupId: g.id, isVerified: false }, orderBy: { invitedCount: 'desc' }, take: 300 }),
      db.groupInviteCredit.findMany({ where: { cityGroupId: g.id }, orderBy: { createdAt: 'desc' }, take: 60 }),
    ]);
    const ids = Array.from(new Set([...waiting.map((w) => w.telegramUserId), ...credits.flatMap((c) => [c.inviterTelegramId, c.invitedTelegramId])]));
    const users = await db.user.findMany({ where: { telegramId: { in: ids } }, select: { telegramId: true, firstName: true, lastName: true, username: true } });
    const nameOf = new Map(
      users.map((u) => [u.telegramId.toString(), [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : null)])
    );
    const nm = (id: bigint) => nameOf.get(id.toString()) || `ID ${id.toString()}`;
    const verifiedCount = await db.groupInviteProgress.count({ where: { cityGroupId: g.id, isVerified: true } });
    return {
      success: true,
      requiredCount: t?.requiredCount ?? null,
      verifiedCount,
      waiting: waiting.map((w) => ({ telegramId: w.telegramUserId.toString(), name: nm(w.telegramUserId), invitedCount: w.invitedCount, since: w.createdAt })),
      credits: credits.map((c) => ({
        at: c.createdAt,
        method: c.method,
        revoked: !!c.revokedAt,
        inviter: { telegramId: c.inviterTelegramId.toString(), name: nm(c.inviterTelegramId) },
        invited: { telegramId: c.invitedTelegramId.toString(), name: nm(c.invitedTelegramId) },
      })),
    };
  });

  // Qo'lda ruxsat berish (bitta odam)
  fastify.post('/admin/useful-bots/invite/:groupId/approve', async (req: any, reply) => {
    const tgRaw = String(req.body?.telegramId || '');
    if (!/^\d{3,20}$/.test(tgRaw)) return reply.code(400).send({ success: false });
    const r = await db.groupInviteProgress.updateMany({ where: { cityGroupId: req.params.groupId, telegramUserId: BigInt(tgRaw) }, data: { isVerified: true } });
    await db.auditLog.create({ data: { userId: req.user?.id ?? null, action: 'INVITE_GATE_APPROVE', details: { groupId: req.params.groupId, telegramId: tgRaw } } }).catch(() => {});
    return { success: r.count > 0 };
  });

  // Hammasini ochish (kutayotgan barcha odamlar)
  fastify.post('/admin/useful-bots/invite/:groupId/approve-all', async (req: any) => {
    const r = await db.groupInviteProgress.updateMany({ where: { cityGroupId: req.params.groupId, isVerified: false }, data: { isVerified: true } });
    await db.auditLog.create({ data: { userId: req.user?.id ?? null, action: 'INVITE_GATE_APPROVE_ALL', details: { groupId: req.params.groupId, count: r.count } } }).catch(() => {});
    return { success: true, count: r.count };
  });
}
