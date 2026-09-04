import { db } from '@kimbor/db';
import { normalizeText, levenshteinDistance } from '../transliteration';
import { matchCategoryFromText } from '../dictionary';

export interface ClusterGroup {
  id: string;
  clusterKey: string;
  canonicalName: string;
  count: number;
  isExistingCategory: boolean; // true = "bazada bor, bot tanimadi", false = "bazada yo'q"
  matchedCategoryName?: string;
  matchedCategoryId?: string;
  rawExamples: string[];
  queryLogIds: string[];
  timeAgo?: string;
}

type QueryLogRow = Awaited<ReturnType<typeof db.queryLog.findMany>>[number];
type CategoryRow = Awaited<ReturnType<typeof db.category.findMany>>[number];

function timeAgoFor(date: Date | undefined): string {
  if (!date) return 'Yaqinda';
  const diffMins = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60));
  if (diffMins < 60) return `${Math.max(1, diffMins)} min oldin`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} soat oldin`;
  return `${Math.floor(diffMins / 1440)} kun oldin`;
}

/**
 * "Javobsiz" so'rovlarni Claude (Anthropic) yordamida ma'nosiga qarab
 * guruhlaydi — turlicha yozilgan, lekin bir xil ma'noni anglatuvchi
 * so'rovlarni (masalan "fotograf kerak", "surat oluvchi bormi",
 * "svadba uchun fotoqiz") bitta klasterga birlashtiradi. API kalit
 * yo'q yoki so'rov muvaffaqiyatsiz bo'lsa — aniq matn bo'yicha oddiy
 * guruhlashga qaytadi (hech qachon butunlay ishlamay qolmaydi).
 */
async function clusterLeftoverWithAI(
  logs: QueryLogRow[],
  apiKey?: string
): Promise<{ label: string; logs: QueryLogRow[] }[]> {
  if (logs.length === 0) return [];

  const MAX_ITEMS = 80;
  const toSend = logs.slice(0, MAX_ITEMS);
  const rest = logs.slice(MAX_ITEMS);
  const claudeKey = apiKey || process.env.ANTHROPIC_API_KEY;

  let groups: { label: string; logs: QueryLogRow[] }[] = [];

  if (claudeKey && claudeKey !== 'your_anthropic_api_key_here' && claudeKey !== 'mock_key') {
    try {
      const inputText = toSend
        .map((l, i) => `${i}: ${(l.rawMessage || l.categoryName || '').slice(0, 200)}`)
        .join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          system:
            "You group short Uzbek/Russian/mixed-language chat messages — people asking for a local tradesperson, service, or shop our directory doesn't have a match for yet — into meaningful real-world profession/service categories. Each input line is \"INDEX: text\". Group lines that express the SAME underlying need together, even if worded very differently or misspelled (e.g. \"fotograf kerak\", \"surat oluvchi bormi\", \"svadba uchun fotograf\" all belong together). Give each group a short, canonical Uzbek label (lowercase, e.g. \"fotograf\", \"murabbiy\"). Every index must appear in exactly one group. If a line is clearly not a real service request (greeting, joke, unrelated chatter), put it in a group labeled exactly \"boshqa\".",
          messages: [{ role: 'user', content: inputText }],
          tools: [
            {
              name: 'group_queries',
              description: 'Group unresolved service queries into labeled clusters',
              input_schema: {
                type: 'object',
                properties: {
                  groups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        indices: { type: 'array', items: { type: 'number' } },
                      },
                      required: ['label', 'indices'],
                    },
                  },
                },
                required: ['groups'],
              },
            },
          ],
          tool_choice: { type: 'tool', name: 'group_queries' },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const toolUse = json.content?.find((b: any) => b.type === 'tool_use');
        const aiGroups = toolUse?.input?.groups as { label: string; indices: number[] }[] | undefined;
        if (aiGroups) {
          for (const g of aiGroups) {
            const groupLogs = (g.indices || []).map((i) => toSend[i]).filter(Boolean) as QueryLogRow[];
            if (groupLogs.length > 0) groups.push({ label: g.label, logs: groupLogs });
          }
        }
      } else {
        console.error('Claude clustering HTTP error:', response.status, await response.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Claude clustering failed:', err);
    }
  }

  // Claude ishlamagan (kalit yo'q, xato, yoki bo'sh javob) — aniq matn
  // bo'yicha oddiy zaxira guruhlashga qaytiladi, hech qachon butunlay
  // ishlamay qolmasligi uchun.
  if (groups.length === 0) {
    const byText = new Map<string, QueryLogRow[]>();
    for (const log of toSend) {
      const key = normalizeText(log.rawMessage || log.categoryName || '');
      if (!byText.has(key)) byText.set(key, []);
      byText.get(key)!.push(log);
    }
    groups = Array.from(byText.values()).map((groupLogs) => ({
      label: groupLogs[0].rawMessage || groupLogs[0].categoryName || 'boshqa',
      logs: groupLogs,
    }));
  }

  // MAX_ITEMS chegarasidan tashqarida qolganlar — aniq matn bo'yicha
  // qo'shimcha kichik klasterlarga bo'linadi (kamdan-kam holat).
  if (rest.length > 0) {
    const byText = new Map<string, QueryLogRow[]>();
    for (const log of rest) {
      const key = normalizeText(log.rawMessage || log.categoryName || '');
      if (!byText.has(key)) byText.set(key, []);
      byText.get(key)!.push(log);
    }
    for (const groupLogs of byText.values()) {
      groups.push({ label: groupLogs[0].rawMessage || groupLogs[0].categoryName || 'boshqa', logs: groupLogs });
    }
  }

  return groups;
}

/**
 * Cluster unresolved queries for a specific city.
 *
 * Uch bosqichli aniqlash: (1) to'liq 87+ kasb lug'ati bo'yicha to'g'ridan-
 * to'g'ri moslashtirish, (2) yozilish xatosiga chidamli (fuzzy) moslashtirish
 * bazadagi haqiqiy kategoriyalarga, (3) hech biriga to'g'ri kelmagan
 * (haqiqatan yangi) so'rovlar uchun Claude yordamida ma'noli guruhlash.
 * Avval faqat 4 ta qattiq kodlangan kasb ("kafelchi", "gazavik",
 * "santexnik", "elektrik") to'g'ri aniqlanardi — qolgan hamma narsa
 * chalkash, guruhlanmagan holda qolardi.
 */
export async function clusterUnresolvedQueries(cityId: string, apiKey?: string): Promise<ClusterGroup[]> {
  if (!cityId) return [];

  // 1. Fetch unresolved query logs for the city
  const logs = await db.queryLog.findMany({
    where: {
      cityId,
      isResolved: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (logs.length === 0) return [];

  // 2. Fetch existing categories in DB to determine if "bazada bor, bot tanimadi"
  const existingCategories = await db.category.findMany();

  const matchedGroups = new Map<string, { canonicalName: string; matchedCat: CategoryRow; logs: QueryLogRow[] }>();
  const leftover: QueryLogRow[] = [];

  for (const log of logs) {
    const rawText = log.rawMessage || log.categoryName || '';
    const normalized = normalizeText(rawText);

    // (1) To'liq lug'at bo'yicha to'g'ridan-to'g'ri moslashtirish
    let matchedCat: CategoryRow | undefined;
    const dictMatch = matchCategoryFromText(normalized);
    if (dictMatch) {
      matchedCat = existingCategories.find((c) => c.name.toLowerCase() === dictMatch.canonicalName.toLowerCase());
    }

    // (2) Yozilish xatosiga chidamli (fuzzy) moslashtirish — dictionary
    // to'g'ridan-to'g'ri topa olmasa ham, bazadagi haqiqiy kategoriya/sinonim
    // nomlariga yaqin bo'lsa topiladi.
    if (!matchedCat) {
      const compact = normalized.replace(/[\s'-]+/g, '');
      let best: { cat: CategoryRow; dist: number } | null = null;
      for (const cat of existingCategories) {
        const targets = [cat.name, ...cat.synonyms]
          .map((s) => normalizeText(s).replace(/[\s'-]+/g, ''))
          .filter((t) => t.length >= 4);
        for (const target of targets) {
          if (Math.abs(target.length - compact.length) > 3) continue;
          const dist = levenshteinDistance(compact, target);
          const threshold = Math.max(1, Math.floor(target.length / 6));
          if (dist <= threshold && (!best || dist < best.dist)) {
            best = { cat, dist };
          }
        }
      }
      if (best) matchedCat = best.cat;
    }

    if (matchedCat) {
      const key = matchedCat.id;
      if (!matchedGroups.has(key)) {
        matchedGroups.set(key, { canonicalName: matchedCat.name, matchedCat, logs: [] });
      }
      matchedGroups.get(key)!.logs.push(log);
    } else {
      leftover.push(log);
    }
  }

  // (3) Hech biriga mos kelmagan — Claude yordamida ma'noli guruhlash
  const aiGroups = await clusterLeftoverWithAI(leftover, apiKey);

  // 3. Save cluster keys to database & return structured clusters
  const resultClusters: ClusterGroup[] = [];

  for (const group of matchedGroups.values()) {
    const ids = group.logs.map((l) => l.id);
    const rawExamples = group.logs.map((l) => l.rawMessage || l.categoryName || group.canonicalName).filter(Boolean);
    const clusterKey = `cluster:${cityId}:${group.matchedCat.id}`;

    await db.queryLog.updateMany({ where: { id: { in: ids } }, data: { clusterKey } });

    resultClusters.push({
      id: clusterKey,
      clusterKey,
      canonicalName: group.canonicalName,
      count: ids.length,
      isExistingCategory: true,
      matchedCategoryName: group.matchedCat.name,
      matchedCategoryId: group.matchedCat.id,
      rawExamples: rawExamples.length > 0 ? rawExamples : [group.canonicalName],
      queryLogIds: ids,
      timeAgo: timeAgoFor(group.logs[0]?.createdAt),
    });
  }

  for (const group of aiGroups) {
    if (group.label === 'boshqa') continue; // aloqasiz suhbat — klaster sifatida ko'rsatilmaydi
    const ids = group.logs.map((l) => l.id);
    const rawExamples = group.logs.map((l) => l.rawMessage || l.categoryName || group.label).filter(Boolean);
    const clusterKey = `cluster:${cityId}:ai:${normalizeText(group.label).replace(/\s+/g, '_')}`;

    await db.queryLog.updateMany({ where: { id: { in: ids } }, data: { clusterKey } });

    resultClusters.push({
      id: clusterKey,
      clusterKey,
      canonicalName: group.label,
      count: ids.length,
      isExistingCategory: false,
      rawExamples: rawExamples.length > 0 ? rawExamples : [group.label],
      queryLogIds: ids,
      timeAgo: timeAgoFor(group.logs[0]?.createdAt),
    });
  }

  // Eng ko'p so'ralgani birinchi ko'rinishi uchun — kamayish tartibida saralanadi
  resultClusters.sort((a, b) => b.count - a.count);

  // 4. Mark queries older than 30 days as stale (without deleting)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db.queryLog.updateMany({
    where: {
      cityId,
      isResolved: false,
      createdAt: { lt: thirtyDaysAgo },
    },
    data: {
      clusterKey: 'stale_queries',
    },
  });

  return resultClusters;
}

export interface NotificationResult {
  notifiedUserIds: string[];
  totalNotified: number;
}

/**
 * Auto-notification loop: When admin adds a new listing,
 * notify all users who previously asked for that category or any of its synonyms.
 * Each user is notified EXACTLY ONCE via QueryLog.notifiedAt.
 */
export async function notifyUsersOnNewListingAdded(options: {
  cityId: string;
  listingId: string;
  categoryName: string;
  sendNotificationFn?: (telegramUserId: bigint, text: string) => Promise<boolean>;
}): Promise<NotificationResult> {
  const { cityId, listingId, categoryName, sendNotificationFn } = options;

  if (!cityId || !listingId) {
    return { notifiedUserIds: [], totalNotified: 0 };
  }

  // 1. Fetch listing details & category synonyms
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { primaryLandmark: true, category: true },
  });

  if (!listing) return { notifiedUserIds: [], totalNotified: 0 };

  // Collect category name + synonyms to match all variant wordings (kafelchi, plitkachi, etc.)
  const searchTerms = [
    categoryName.toLowerCase(),
    ...(listing.category?.name ? [listing.category.name.toLowerCase()] : []),
    ...(listing.category?.synonyms ? listing.category.synonyms.map((s) => s.toLowerCase()) : []),
  ];

  // Also include clusterKey pattern
  const normCategory = normalizeText(categoryName);
  let canonicalTrade = normCategory;
  if (/kafel|plitka/.test(normCategory)) canonicalTrade = 'kafelchi';
  else if (/gazovik|gazavik|gaz ustasi/.test(normCategory)) canonicalTrade = 'gazavik';
  else if (/santexnik|quvur|suv ustasi/.test(normCategory)) canonicalTrade = 'santexnik';

  const clusterKeyPattern = `cluster:${cityId}:${canonicalTrade}`;

  // 2. Find unresolved query logs for this city matching category, synonyms, or clusterKey
  const pendingLogs = await db.queryLog.findMany({
    where: {
      cityId,
      isResolved: false,
      notifiedAt: null,
      OR: [
        { clusterKey: clusterKeyPattern },
        { categoryName: { in: searchTerms, mode: 'insensitive' } },
        ...searchTerms.map((term) => ({
          rawMessage: { contains: term, mode: 'insensitive' as const },
        })),
      ],
    },
  });

  if (pendingLogs.length === 0) {
    return { notifiedUserIds: [], totalNotified: 0 };
  }

  // 3. Group by unique telegramUserId to prevent double notifications
  const userLogsMap = new Map<string, typeof pendingLogs>();
  for (const log of pendingLogs) {
    const userIdStr = log.telegramUserId.toString();
    if (!userLogsMap.has(userIdStr)) {
      userLogsMap.set(userIdStr, []);
    }
    userLogsMap.get(userIdStr)!.push(log);
  }

  const notifiedUserIds: string[] = [];

  // Format provider notification card
  const verifiedBadge = listing.verification === 'VERIFIED' ? '✅' : '⚠️';
  const landmarkText = listing.primaryLandmark ? `📍 ${listing.primaryLandmark.name}\n` : '';
  const notificationText = `Siz ${categoryName} so'ragan edingiz — endi bazamizda bor 👇\n\n🔧 ${listing.category?.name || categoryName}\n${listing.name} ${verifiedBadge}\n${landmarkText}📞 ${listing.phone}`;

  // 4. Send notification and mark QueryLog as notified and resolved
  for (const [userIdStr, logs] of userLogsMap.entries()) {
    const userId = BigInt(userIdStr);
    let sentSuccess = true;

    if (sendNotificationFn) {
      sentSuccess = await sendNotificationFn(userId, notificationText);
    }

    if (sentSuccess) {
      const logIds = logs.map((l) => l.id);
      await db.queryLog.updateMany({
        where: { id: { in: logIds } },
        data: {
          isResolved: true,
          resolvedListingId: listing.id,
          notifiedAt: new Date(),
        },
      });
      notifiedUserIds.push(userIdStr);
    }
  }

  return {
    notifiedUserIds,
    totalNotified: notifiedUserIds.length,
  };
}
