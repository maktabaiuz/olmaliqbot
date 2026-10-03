FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
# pnpm 10+: lockfile'dagi barcha workspace loyihalari package.json'i bo'lishi shart
COPY apps/api/package.json apps/api/
COPY apps/bot/package.json apps/bot/
COPY apps/webapp/package.json apps/webapp/
COPY apps/userapp/package.json apps/userapp/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/

COPY packages/types/ ./packages/types/
COPY apps/webapp/ ./apps/webapp/

RUN pnpm install --frozen-lockfile --filter @kimbor/webapp... --ignore-scripts
RUN pnpm --filter @kimbor/webapp build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/webapp/dist /usr/share/nginx/html
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
