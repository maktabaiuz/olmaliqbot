FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kimbor/db db:generate
RUN pnpm --filter @kimbor/types build && pnpm --filter @kimbor/db build && pnpm --filter @kimbor/core build
RUN pnpm --filter @kimbor/api build

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
