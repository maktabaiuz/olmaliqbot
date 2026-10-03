FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

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
COPY apps/userapp/ ./apps/userapp/

RUN pnpm install --frozen-lockfile --filter @kimbor/userapp... --ignore-scripts
RUN pnpm --filter @kimbor/userapp build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/userapp/dist /usr/share/nginx/html
COPY apps/userapp/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
