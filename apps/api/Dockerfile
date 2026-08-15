FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @kimbor/db build || true
RUN pnpm --filter @kimbor/types build || true
RUN pnpm --filter @kimbor/core build || true
RUN pnpm --filter @kimbor/api build

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
