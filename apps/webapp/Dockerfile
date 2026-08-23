FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/types/package.json packages/types/
COPY apps/webapp/package.json apps/webapp/

COPY packages/types/ ./packages/types/
COPY apps/webapp/ ./apps/webapp/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kimbor/webapp build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/webapp/dist /usr/share/nginx/html
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
