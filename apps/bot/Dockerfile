FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY apps/bot/package.json ./apps/bot/

RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install

COPY packages/ ./packages/
COPY apps/bot/ ./apps/bot/

RUN pnpm --filter @kimbor/db build || true
RUN pnpm --filter @kimbor/types build || true
RUN pnpm --filter @kimbor/core build || true
RUN pnpm --filter @kimbor/bot build

CMD ["node", "apps/bot/dist/index.js"]
