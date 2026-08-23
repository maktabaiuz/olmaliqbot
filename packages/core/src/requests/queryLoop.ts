import { db } from '@kimbor/db';
import { normalizeText } from '../transliteration';

export interface ClusterGroup {
  clusterKey: string;
  canonicalName: string;
  count: number;
  isExistingCategory: boolean; // true = "bazada bor, bot tanimadi", false = "bazada yo'q"
  matchedCategoryId?: string;
  matchedCategoryName?: string;
  queryLogIds: string[];
  rawExamples: string[];
  latestAt: Date;
}

/**
 * Cluster unresolved queries for a specific city.
 * Groups queries by meaning (e.g. kafelchi, plitkachi, kafel ustasi -> kafelchi).
 */
export async function clusterUnresolvedQueries(cityId: string): Promise<ClusterGroup[]> {
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

  const clustersMap = new Map<string, { logs: typeof logs; canonicalName: string; matchedCat?: typeof existingCategories[0] }>();

  for (const log of logs) {
    const rawCat = log.categoryName || log.rawMessage;
    const normalized = normalizeText(rawCat);

    // Normalize trade names (kafelchi, plitkachi, kafel ustasi -> kafelchi)
    let canonical = normalized;
    if (/kafel|plitka/.test(normalized)) canonical = 'kafelchi';
    else if (/gazovik|gazavik|gaz ustasi/.test(normalized)) canonical = 'gazavik';
    else if (/santexnik|quvur|suv ustasi/.test(normalized)) canonical = 'santexnik';
    else if (/elektrik|svet ustasi/.test(normalized)) canonical = 'elektrik';

    // Match with existing categories
    const matchedCat = existingCategories.find(
      (cat) =>
        cat.name.toLowerCase() === canonical ||
        cat.synonyms.some((syn) => syn.toLowerCase() === canonical)
    );

    const clusterKey = `cluster:${cityId}:${canonical}`;

    if (!clustersMap.has(clusterKey)) {
      clustersMap.set(clusterKey, {
        logs: [],
        canonicalName: matchedCat ? matchedCat.name : canonical,
        matchedCat,
      });
    }

    clustersMap.get(clusterKey)!.logs.push(log);
  }

  // 3. Save cluster keys to database & return structured clusters
  const resultClusters: ClusterGroup[] = [];

  for (const [clusterKey, group] of clustersMap.entries()) {
    const ids = group.logs.map((l) => l.id);

    // Update QueryLog clusterKey in DB
    await db.queryLog.updateMany({
      where: { id: { in: ids } },
      data: { clusterKey },
    });

    resultClusters.push({
      clusterKey,
      canonicalName: group.canonicalName,
      count: ids.length,
      isExistingCategory: !!group.matchedCat,
      matchedCategoryId: group.matchedCat?.id,
      matchedCategoryName: group.matchedCat?.name,
      queryLogIds: ids,
      rawExamples: group.logs.slice(0, 3).map((l) => l.rawMessage),
      latestAt: group.logs[0].createdAt,
    });
  }

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
  const notificationText = `Siz ${categoryName} so'ragan edingiz — endi bazamizda bor 👇\n\n🔧 ${listing.category?.name || categoryName}\n${listing.name} ${verifiedBadge} ⭐${listing.bayesianRating.toFixed(1)}\n${landmarkText}📞 ${listing.phone}`;

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
