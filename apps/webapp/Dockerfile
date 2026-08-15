# Multi-stage build for React Vite WebApp
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY apps/webapp/package.json ./apps/webapp/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install

# Copy source files
COPY packages/ ./packages/
COPY apps/webapp/ ./apps/webapp/

# Build dependencies and webapp
RUN pnpm --filter @kimbor/db build || true
RUN pnpm --filter @kimbor/types build || true
RUN pnpm --filter @kimbor/core build || true
RUN pnpm --filter @kimbor/webapp build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy custom nginx config if needed or replace default static files
COPY --from=builder /app/apps/webapp/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
