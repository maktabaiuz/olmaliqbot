import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { db } from '@kimbor/db';
import { requireAdmin, requireSuperAdmin } from './adminRoutes';
import { UPLOADS_DIR } from '../uploadsPath';

/**
 * Admin "Userlar" (2026-10-08 qayta qurilgan) — raqamsiz, faqat Telegram ID.
 * Bot, @uz11_bot, ilova va guruhlardagi barcha odamlar; har biri uchun
 * faollik, so'rovlar, e'lonlar, ishonch va qaysi guruhdan kelgani.
 */

const DAY = 86400_000;
const RENT_RE = /arenda|ijara|kvartira|hovli|uy\b/i;
const AVATAR_DIR = path.join(UPLOADS_DIR, 'avatars');
const AVATAR_TTL_MS = 3 * DAY;

type Segment = 'all' | 'bot' | 'active' | 'new' | 'seekers' | 'owners' | 'business' | 'unanswered' | 'blocked' | 'complaints' | 'group_only' | 'suspended';

async function tg(method: string, params: Record<string, string>) {
  const token = process.env.BOT_TOKEN;
  if (!token) return null;
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}?${q}`).catch(() => null);
  if (!r || !r.ok) return null;
  const j: any = await r.json().catch(() => null);
  return j?.ok ? j.result : null;
}

/** Barcha odamlar + hisoblangan ko'rsatkichlar (bitta joyda — ro'yxat, segment va ommaviy xabar uchun). */
async function buildPeople() {
  const since7 = new Date(Date.now() - 7 * DAY);
  const [users, groups, q, qUnres, qRent, dm, dmComplaints, gm, owned, rejected, modLogs] = await Promise.all([
    db.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true, telegramId: true, firstName: true, lastName: true, username: true, languageCode: true, isPremium: true,
        firstSeenVia: true, sourceGroupChatId: true, startParam: true, startedBotAt: true, botBlockedAt: true,
        lastSeenAt: true, isSuspended: true, createdAt: true,
      },
    }),
    db.cityGroup.findMany({ select: { chatId: true, title: true } }),
    db.queryLog.groupBy({ by: ['telegramUserId'], where: { intent: { not: 'NOT_RELEVANT' } }, _count: { _all: true }, _max: { createdAt: true } }),
    db.queryLog.groupBy({ by: ['telegramUserId'], where: { intent: { not: 'NOT_RELEVANT' }, isResolved: false }, _count: { _all: true } }),
    db.queryLog.findMany({ where: { intent: { not: 'NOT_RELEVANT' }, categoryName: { not: null } }, select: { telegramUserId: true, categoryName: true }, distinct: ['telegramUserId', 'categoryName'] }),
    db.chatMessage.groupBy({ by: ['telegramUserId'], where: { senderType: 'USER' }, _count: { _all: true }, _max: { createdAt: true } }),
    db.chatMessage.groupBy({ by: ['telegramUserId'], where: { isComplaint: true }, _count: { _all: true } }),
    db.groupMessageEvent.groupBy({ by: ['telegramUserId'], _count: { _all: true }, _max: { createdAt: true } }),
    db.listing.groupBy({ by: ['ownerTelegramId', 'type'], where: { ownerTelegramId: { not: null }, status: { not: 'ARCHIVED' } }, _count: { _all: true } }),
    db.listing.groupBy({ by: ['ownerTelegramId'], where: { ownerTelegramId: { not: null }, moderationStatus: 'rejected' }, _count: { _all: true } }),
    db.moderationLog.groupBy({ by: ['telegramUserId'], _count: { _all: true } }),
  ]);

  const k = (x: bigint | null) => (x == null ? '' : x.toString());
  const groupTitle = new Map(groups.map((g) => [g.chatId.toString(), g.title || 'Guruh']));
  const qMap = new Map(q.map((r) => [k(r.telegramUserId), { n: r._count._all, last: r._max.createdAt }]));
  const unresMap = new Map(qUnres.map((r) => [k(r.telegramUserId), r._count._all]));
  const seekers = new Set(qRent.filter((r) => RENT_RE.test(r.categoryName || '')).map((r) => k(r.telegramUserId)));
  const dmMap = new Map(dm.map((r) => [k(r.telegramUserId), { n: r._count._all, last: r._max.createdAt }]));
  const complaintMap = new Map(dmComplaints.map((r) => [k(r.telegramUserId), r._count._all]));
  const gmMap = new Map(gm.map((r) => [k(r.telegramUserId), { n: r._count._all, last: r._max.createdAt }]));
  const ownMap = new Map<string, { rentals: number; business: number }>();
  for (const r of owned) {
    const o = ownMap.get(k(r.ownerTelegramId)) || { rentals: 0, business: 0 };
    if (r.type === 'ARENDA') o.rentals += r._count._all;
    else o.business += r._count._all;
    ownMap.set(k(r.ownerTelegramId), o);
  }
  const rejMap = new Map(rejected.map((r) => [k(r.ownerTelegramId), r._count._all]));
  const modMap = new Map(modLogs.map((r) => [k(r.telegramUserId), r._count._all]));

  return users.map((u) => {
    const id = u.telegramId.toString();
    const lastCandidates = [u.lastSeenAt, qMap.get(id)?.last, dmMap.get(id)?.last, gmMap.get(id)?.last].filter(Boolean) as Date[];
    const lastActive = lastCandidates.length ? new Date(Math.max(...lastCandidates.map((d) => d.getTime()))) : u.createdAt;
    const own = ownMap.get(id) || { rentals: 0, business: 0 };
    const rejectedN = rejMap.get(id) || 0;
    const moderatedN = modMap.get(id) || 0;
    const complaints = complaintMap.get(id) || 0;
    const trust: 'trusted' | 'normal' | 'risky' =
      rejectedN + moderatedN + complaints >= 3 ? 'risky' : (own.rentals + own.business > 0 && rejectedN === 0) || (qMap.get(id)?.n || 0) >= 5 ? 'trusted' : 'normal';
    // Botda = botni ishga tushirgan (startedBotAt — birinchi bot xabari yoki /start)
    const startedBot = !!u.startedBotAt || (dmMap.get(id)?.n || 0) > 0;
    const botLastCandidates = [dmMap.get(id)?.last, u.startedBotAt].filter(Boolean) as Date[];
    const botLast = botLastCandidates.length ? new Date(Math.max(...botLastCandidates.map((d) => d.getTime()))) : null;
    return {
      id: u.id,
      telegramId: id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null,
      username: u.username,
      languageCode: u.languageCode,
      isPremium: u.isPremium,
      via: u.firstSeenVia || (startedBot ? 'bot' : 'group'),
      sourceGroupChatId: u.sourceGroupChatId ? u.sourceGroupChatId.toString() : null,
      sourceGroupTitle: u.sourceGroupChatId ? groupTitle.get(u.sourceGroupChatId.toString()) || 'Boshqa guruh' : null,
      startParam: u.startParam,
      startedBot,
      startedBotAt: u.startedBotAt,
      botLast,
      botActive7: !!botLast && botLast >= since7,
      blocked: !!u.botBlockedAt,
      suspended: u.isSuspended,
      createdAt: u.createdAt,
      lastActive,
      queries: qMap.get(id)?.n || 0,
      unanswered: unresMap.get(id) || 0,
      dmMessages: dmMap.get(id)?.n || 0,
      groupMessages: gmMap.get(id)?.n || 0,
      rentals: own.rentals,
      business: own.business,
      seeker: seekers.has(id),
      rejected: rejectedN,
      moderated: moderatedN,
      complaints,
      trust,
      activeRecently: lastActive >= since7,
    };
  });
}
type Person = Awaited<ReturnType<typeof buildPeople>>[number];

function inSegment(p: Person, s: Segment): boolean {
  switch (s) {
    case 'bot': return p.startedBot;
    // "Faol" va "Yangi" — faqat BOT bo'yicha (guruhda yozish hisobga olinmaydi)
    case 'active': return p.botActive7;
    case 'new': return !!p.startedBotAt && new Date(p.startedBotAt).getTime() >= Date.now() - 7 * DAY;
    case 'seekers': return p.seeker;
    case 'owners': return p.rentals > 0;
    case 'business': return p.business > 0;
    case 'unanswered': return p.unanswered > 0;
    case 'blocked': return p.blocked;
    case 'complaints': return p.complaints > 0 || p.trust === 'risky';
    case 'group_only': return !p.startedBot;
    case 'suspended': return p.suspended;
    default: return true;
  }
}
const SEGMENTS: Segment[] = ['all', 'bot', 'active', 'new', 'seekers', 'owners', 'business', 'unanswered', 'blocked', 'complaints', 'group_only', 'suspended'];

export async function adminPeople(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req: any, reply) => {
    if (!(await requireAdmin(req, reply))) return reply;
  });

  // ---------- Ro'yxat + statistika ----------
  fastify.get('/admin/people', async (req: any) => {
    const segment = (SEGMENTS.includes(req.query.segment) ? req.query.segment : 'all') as Segment;
    const search = String(req.query.search || '').trim().toLowerCase().replace(/^@/, '');
    const sort = String(req.query.sort || 'recent');
    const page = Math.max(0, Number(req.query.page) || 0);
    const pageSize = 40;

    const people = await buildPeople();
    const counts = Object.fromEntries(SEGMENTS.map((s) => [s, people.filter((p) => inSegment(p, s)).length]));

    // 14 kunlik: botga YANGI qo'shilganlar (botni birinchi ishga tushirgan kun, Toshkent)
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' });
    const days = Array.from({ length: 14 }, (_, i) => fmt.format(new Date(Date.now() - (13 - i) * DAY)));
    const perDay = new Map(days.map((d) => [d, 0]));
    for (const p of people) {
      if (!p.startedBotAt) continue;
      const d = fmt.format(new Date(p.startedBotAt));
      if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1);
    }
    const todayKey = fmt.format(new Date());

    let list = people.filter((p) => inSegment(p, segment));
    if (search) {
      const digits = search.replace(/\D/g, '');
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(search) ||
          (p.username || '').toLowerCase().includes(search) ||
          (digits.length >= 4 && p.telegramId.includes(digits))
      );
    }
    list.sort((a, b) =>
      sort === 'new' ? b.createdAt.getTime() - a.createdAt.getTime()
      : sort === 'queries' ? b.queries - a.queries || b.lastActive.getTime() - a.lastActive.getTime()
      : sort === 'groups' ? b.groupMessages - a.groupMessages
      : b.lastActive.getTime() - a.lastActive.getTime()
    );

    return {
      success: true,
      stats: {
        total: people.length,
        botUsers: counts.bot,
        groupOnly: counts.group_only,
        newToday: perDay.get(todayKey) || 0,
        new7: counts.new,
        active7: counts.active,
        blocked: counts.blocked,
        appUsers: people.filter((p) => p.via === 'app' || p.via === 'uz11').length,
        newPerDay: days.map((d) => ({ date: d, value: perDay.get(d) || 0 })),
      },
      counts,
      total: list.length,
      page,
      pageSize,
      items: list.slice(page * pageSize, page * pageSize + pageSize),
    };
  });

  // ---------- Qaysi guruhdan kelishyapti ----------
  fastify.get('/admin/people/sources', async () => {
    const people = await buildPeople();
    const since30 = Date.now() - 30 * DAY;
    const by = new Map<string, { title: string; total: number; startedBot: number; viaAdLink: number; new30: number; posted: number; active7: number }>();
    for (const p of people) {
      const key = p.sourceGroupChatId || (p.via === 'app' ? 'app' : p.via === 'uz11' ? 'uz11' : 'direct');
      const title = p.sourceGroupTitle || (key === 'app' ? '📱 Ilova' : key === 'uz11' ? '🤖 @uz11_bot' : "🔗 To'g'ridan-to'g'ri / boshqa");
      const r = by.get(key) || { title, total: 0, startedBot: 0, viaAdLink: 0, new30: 0, posted: 0, active7: 0 };
      r.total++;
      if (p.startedBot) r.startedBot++;
      if (p.startParam && /^g\d+$/.test(p.startParam)) r.viaAdLink++;
      if (p.createdAt.getTime() >= since30) r.new30++;
      if (p.rentals + p.business > 0) r.posted++;
      if (p.activeRecently) r.active7++;
      by.set(key, r);
    }
    const rows = [...by.entries()]
      .map(([key, r]) => ({ key, ...r, conversion: r.total ? Math.round((r.startedBot / r.total) * 100) : 0 }))
      .sort((a, b) => b.startedBot - a.startedBot || b.total - a.total);
    return { success: true, rows };
  });

  // ---------- Profil ----------
  fastify.get('/admin/people/:tg', async (req: any, reply) => {
    if (!/^\d{3,20}$/.test(req.params.tg)) return reply.code(400).send({ success: false });
    const tgId = BigInt(req.params.tg);
    const people = await buildPeople();
    const person = people.find((p) => p.telegramId === req.params.tg);
    if (!person) return reply.code(404).send({ success: false, message: 'Topilmadi' });

    const [queries, chats, listings, mods, perGroup, groups] = await Promise.all([
      db.queryLog.findMany({ where: { telegramUserId: tgId, intent: { not: 'NOT_RELEVANT' } }, orderBy: { createdAt: 'desc' }, take: 40, select: { createdAt: true, rawMessage: true, categoryName: true, isResolved: true, chatId: true } }),
      db.chatMessage.findMany({ where: { telegramUserId: tgId }, orderBy: { createdAt: 'desc' }, take: 20, select: { createdAt: true, senderType: true, text: true, isComplaint: true } }),
      db.listing.findMany({ where: { ownerTelegramId: tgId }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, type: true, status: true, moderationStatus: true, rejectionNote: true, createdAt: true, category: { select: { name: true } } } }),
      db.moderationLog.findMany({ where: { telegramUserId: tgId }, orderBy: { createdAt: 'desc' }, take: 20, select: { createdAt: true, category: true, rawMessage: true, chatId: true } }),
      db.groupMessageEvent.groupBy({ by: ['chatId'], where: { telegramUserId: tgId }, _count: { _all: true }, _max: { createdAt: true } }),
      db.cityGroup.findMany({ select: { chatId: true, title: true } }),
    ]);
    const title = new Map(groups.map((g) => [g.chatId.toString(), g.title || 'Guruh']));

    type Ev = { at: Date; kind: string; title: string; detail?: string; tone?: 'good' | 'bad' | 'neutral' };
    const timeline: Ev[] = [
      ...queries.map((q) => ({
        at: q.createdAt,
        kind: 'query',
        title: q.isResolved ? 'Savol berdi — javob oldi' : 'Savol berdi — javobsiz qoldi',
        detail: `${q.rawMessage.slice(0, 160)}${q.chatId ? ` · ${title.get(q.chatId.toString()) || 'guruh'}` : ' · bot chati'}`,
        tone: (q.isResolved ? 'good' : 'bad') as Ev['tone'],
      })),
      ...chats.filter((c) => c.senderType === 'USER').map((c) => ({ at: c.createdAt, kind: c.isComplaint ? 'complaint' : 'dm', title: c.isComplaint ? 'Shikoyat qildi' : 'Botga yozdi', detail: c.text.slice(0, 160), tone: (c.isComplaint ? 'bad' : 'neutral') as Ev['tone'] })),
      ...listings.map((l) => ({
        at: l.createdAt,
        kind: 'listing',
        title: `${l.type === 'ARENDA' ? "Ijara e'loni" : 'Biznes'} qo'shdi: ${l.name}`,
        detail: l.moderationStatus === 'rejected' ? `Rad etilgan: ${l.rejectionNote || ''}` : l.moderationStatus === 'pending' ? 'Tekshiruvda' : l.status === 'ACTIVE' ? 'Faol' : l.status,
        tone: (l.moderationStatus === 'rejected' ? 'bad' : 'good') as Ev['tone'],
      })),
      ...mods.map((m) => ({ at: m.createdAt, kind: 'moderation', title: `Moderatsiya: ${m.category}`, detail: `${m.rawMessage.slice(0, 120)} · ${title.get(m.chatId.toString()) || 'guruh'}`, tone: 'bad' as const })),
    ];
    if (person.startedBot) timeline.push({ at: person.createdAt, kind: 'join', title: person.via === 'group' ? 'Guruhda paydo bo\'ldi' : 'Botni ishga tushirdi', tone: 'neutral' });
    timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

    return {
      success: true,
      person,
      groups: perGroup
        .map((g) => ({ chatId: g.chatId.toString(), title: title.get(g.chatId.toString()) || 'Guruh', messages: g._count._all, last: g._max.createdAt }))
        .sort((a, b) => b.messages - a.messages),
      listings: listings.map((l) => ({ ...l, category: l.category?.name || '' })),
      timeline: timeline.slice(0, 80),
    };
  });

  // ---------- Avatar (Telegram'dan, diskda 3 kun keshlanadi) ----------
  fastify.get('/admin/people/:tg/avatar', async (req: any, reply) => {
    if (!/^\d{3,20}$/.test(req.params.tg)) return reply.code(400).send();
    const file = path.join(AVATAR_DIR, `${req.params.tg}.jpg`);
    const none = path.join(AVATAR_DIR, `${req.params.tg}.none`);
    try {
      const st = await fs.promises.stat(file).catch(() => null);
      if (st && Date.now() - st.mtimeMs < AVATAR_TTL_MS) {
        reply.header('cache-control', 'private, max-age=86400').type('image/jpeg');
        return fs.createReadStream(file);
      }
      const stNone = await fs.promises.stat(none).catch(() => null);
      if (stNone && Date.now() - stNone.mtimeMs < AVATAR_TTL_MS) return reply.code(404).send();

      const photos = await tg('getUserProfilePhotos', { user_id: req.params.tg, limit: '1' });
      const sizes = photos?.photos?.[0];
      if (!sizes?.length) {
        await fs.promises.mkdir(AVATAR_DIR, { recursive: true });
        await fs.promises.writeFile(none, '');
        return reply.code(404).send();
      }
      const small = sizes.find((s: any) => s.width >= 160) || sizes[sizes.length - 1];
      const f = await tg('getFile', { file_id: small.file_id });
      if (!f?.file_path) return reply.code(404).send();
      const img = await fetch(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${f.file_path}`);
      if (!img.ok) return reply.code(404).send();
      const buf = Buffer.from(await img.arrayBuffer());
      await fs.promises.mkdir(AVATAR_DIR, { recursive: true });
      await fs.promises.writeFile(file, buf);
      reply.header('cache-control', 'private, max-age=86400').type('image/jpeg');
      return buf;
    } catch {
      return reply.code(404).send();
    }
  });

  // ---------- To'xtatish / qayta yoqish ----------
  fastify.post('/admin/people/:tg/suspend', async (req: any, reply) => {
    if (!(await requireSuperAdmin(req, reply))) return;
    if (!/^\d{3,20}$/.test(req.params.tg)) return reply.code(400).send({ success: false });
    const suspend = !!req.body?.suspend;
    const r = await db.user.updateMany({
      where: { telegramId: BigInt(req.params.tg), role: 'USER' },
      data: { isSuspended: suspend, suspendedAt: suspend ? new Date() : null },
    });
    if (!r.count) return reply.code(404).send({ success: false, message: 'Topilmadi' });
    await db.auditLog.create({ data: { userId: req.user?.id ?? null, action: suspend ? 'USER_SUSPEND' : 'USER_UNSUSPEND', details: { telegramId: req.params.tg } } }).catch(() => {});
    return { success: true, suspended: suspend };
  });

  // ---------- Segmentga xabar (faqat botni ishga tushirgan va bloklamaganlarga) ----------
  fastify.post('/admin/people/broadcast', async (req: any, reply) => {
    if (!(await requireSuperAdmin(req, reply))) return;
    const segment = (SEGMENTS.includes(req.body?.segment) ? req.body.segment : 'all') as Segment;
    const text = String(req.body?.text || '').trim().slice(0, 3500);
    const dryRun = req.body?.dryRun !== false;
    const people = (await buildPeople()).filter((p) => inSegment(p, segment) && p.startedBot && !p.blocked && !p.suspended);
    if (dryRun) return { success: true, recipients: people.length };
    if (text.length < 3) return reply.code(400).send({ success: false, message: 'Xabar matnini yozing' });
    const token = process.env.BOT_TOKEN;
    if (!token) return reply.code(500).send({ success: false });

    let sent = 0;
    let failed = 0;
    for (const p of people.slice(0, 2000)) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: p.telegramId, text, parse_mode: 'HTML' }),
      }).catch(() => null);
      if (r?.ok) sent++;
      else {
        failed++;
        if (r?.status === 403) await db.user.updateMany({ where: { telegramId: BigInt(p.telegramId) }, data: { botBlockedAt: new Date() } }).catch(() => {});
      }
      await new Promise((res) => setTimeout(res, 50)); // Telegram limiti: ~20 xabar/soniya
    }
    await db.auditLog.create({ data: { userId: req.user?.id ?? null, action: 'USER_SEGMENT_BROADCAST', details: { segment, sent, failed, text: text.slice(0, 300) } } }).catch(() => {});
    return { success: true, sent, failed };
  });
}
