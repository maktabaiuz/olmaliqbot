#!/bin/bash
# =============================================================================
# deploy.sh — One-Command Production Deployment & Automated Rollback Script
# =============================================================================

set -euo pipefail

PROJECT_DIR="/root/kimbor"
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "initial")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Starting Production Deployment..."
echo "Current Commit: $PREV_COMMIT"

cd "$PROJECT_DIR"

# 1. Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main || git pull origin master || true

# 2. Build & start container services
echo "🔨 Rebuilding Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Apply Prisma database schema updates
echo "🗄 Running Prisma database sync..."
docker exec kimbor_api pnpm --filter @kimbor/db exec prisma db push --schema=./prisma/schema.prisma || true

# 4. Verify deployment health
echo "🔍 Verifying deployment health..."
sleep 5

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://olmaliq.online/api/health || echo "000")

if [ "$HEALTH_STATUS" == "200" ]; then
  NEW_COMMIT=$(git rev-parse HEAD)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ DEPLOYMENT SUCCESSFUL! New Commit: $NEW_COMMIT"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ DEPLOYMENT FAILED (HTTP Status: $HEALTH_STATUS)! Initiating Rollback..."
  if [ "$PREV_COMMIT" != "initial" ]; then
    git reset --hard "$PREV_COMMIT"
    docker compose -f docker-compose.prod.yml up -d --build
    echo "⏪ Rollback completed to commit $PREV_COMMIT."
  fi
  exit 1
fi
