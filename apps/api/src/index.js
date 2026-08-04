"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const adminRoutes_1 = require("./routes/adminRoutes");
dotenv_1.default.config({ path: '../../.env' });
const fastify = (0, fastify_1.default)({ logger: true });
async function main() {
    await fastify.register(cors_1.default, { origin: true });
    await fastify.register(adminRoutes_1.adminRoutes, { prefix: '/api' });
    fastify.get('/health', async () => {
        return { status: 'ok', service: 'kimbor-api', timestamp: new Date().toISOString() };
    });
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.HOST || '0.0.0.0';
    try {
        await fastify.listen({ port, host });
        console.log(`⚡ API server running on http://${host}:${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map