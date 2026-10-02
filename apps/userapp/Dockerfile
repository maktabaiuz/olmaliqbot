FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/userapp/package.json apps/userapp/
COPY apps/userapp/ ./apps/userapp/

RUN pnpm install --frozen-lockfile --filter @kimbor/userapp...
RUN pnpm --filter @kimbor/userapp build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/userapp/dist /usr/share/nginx/html
COPY apps/userapp/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
