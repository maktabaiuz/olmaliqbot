export interface ClusterGroup {
    clusterKey: string;
    canonicalName: string;
    count: number;
    isExistingCategory: boolean;
    matchedCategoryId?: string;
    queryLogIds: string[];
}
/**
 * Cluster unresolved queries for a specific city.
 * Groups queries by meaning (e.g. kafelchi, plitkachi, kafel ustasi -> kafelchi).
 */
export declare function clusterUnresolvedQueries(cityId: string): Promise<ClusterGroup[]>;
export interface NotificationResult {
    notifiedUserIds: string[];
    totalNotified: number;
}
/**
 * Auto-notification loop: When admin adds a new listing,
 * notify all users who previously asked for that category or any of its synonyms.
 * Each user is notified EXACTLY ONCE via QueryLog.notifiedAt.
 */
export declare function notifyUsersOnNewListingAdded(options: {
    cityId: string;
    listingId: string;
    categoryName: string;
    sendNotificationFn?: (telegramUserId: bigint, text: string) => Promise<boolean>;
}): Promise<NotificationResult>;
//# sourceMappingURL=queryLoop.d.ts.map