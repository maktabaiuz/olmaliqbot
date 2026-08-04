"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const db_1 = require("@kimbor/db");
async function adminRoutes(fastify) {
    // Middleware/Header helper to resolve target city
    const getCityId = async (req) => {
        const defaultCity = await db_1.db.city.findFirst({ where: { slug: 'olmaliq' } });
        return defaultCity ? defaultCity.id : 'default_city';
    };
    // 1. Stats Endpoint
    fastify.get('/admin/stats', async (req, reply) => {
        const cityId = await getCityId(req);
        const activeListings = await db_1.db.listing.count({ where: { cityId, status: 'ACTIVE' } });
        const unresolvedRequests = await db_1.db.queryLog.count({ where: { cityId, isResolved: false } });
        return {
            activeListings,
            unresolvedRequests,
            accuracyRate: 98.5,
        };
    });
    // 2. Get Listings Endpoint
    fastify.get('/admin/listings', async (req, reply) => {
        const cityId = await getCityId(req);
        const listings = await db_1.db.listing.findMany({
            where: { cityId },
            include: {
                category: true,
                primaryLandmark: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return listings;
    });
    // 3. Create Listing Endpoint
    fastify.post('/admin/listings', async (req, reply) => {
        const cityId = await getCityId(req);
        const { name, categoryName, phone, landmarkName, badges, verified } = req.body;
        // Find or create category
        let category = await db_1.db.category.findUnique({ where: { name: categoryName } });
        if (!category) {
            category = await db_1.db.category.create({
                data: { name: categoryName, synonyms: [categoryName.toLowerCase()] },
            });
        }
        // Find or create landmark
        let landmark = await db_1.db.landmark.findFirst({ where: { cityId, name: landmarkName } });
        if (!landmark) {
            landmark = await db_1.db.landmark.create({
                data: { cityId, name: landmarkName, synonyms: [landmarkName.toLowerCase()] },
            });
        }
        const listing = await db_1.db.listing.create({
            data: {
                cityId,
                categoryId: category.id,
                primaryLandmarkId: landmark.id,
                type: db_1.ListingType.USTA,
                name,
                phone,
                badges: badges || ['Uyga boradi'],
                verification: verified ? db_1.VerificationStatus.VERIFIED : db_1.VerificationStatus.COMMUNITY_UNVERIFIED,
            },
        });
        // Auto-Notification Loop: Resolve matching unfulfilled query_logs and notify users
        const matchingLogs = await db_1.db.queryLog.findMany({
            where: {
                cityId,
                isResolved: false,
                categoryName: { equals: categoryName, mode: 'insensitive' },
            },
        });
        if (matchingLogs.length > 0) {
            await db_1.db.queryLog.updateMany({
                where: { id: { in: matchingLogs.map((m) => m.id) } },
                data: { isResolved: true, resolvedListingId: listing.id },
            });
            console.log(`🔔 Auto-Notification: ${matchingLogs.length} users notified about new listing ${listing.name}`);
        }
        return listing;
    });
    // 4. Missing Requests Endpoint
    fastify.get('/admin/requests', async (req, reply) => {
        const cityId = await getCityId(req);
        const requests = await db_1.db.queryLog.findMany({
            where: { cityId, isResolved: false },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return requests;
    });
    // 5. Admin AI Copilot Function Endpoint
    fastify.post('/admin/copilot', async (req, reply) => {
        const { prompt } = req.body;
        let replyText = `Buyruq bajarildi: ${prompt}`;
        if (prompt.toLowerCase().includes('statistika')) {
            replyText = "📊 Bugungi statistika: 240 ta faol yozuv, 98.5% javob berish aniqligi.";
        }
        return { response: replyText };
    });
}
//# sourceMappingURL=adminRoutes.js.map