#!/bin/bash
# Hostinger VPS Auto-Pull & Re-deploy script
# Runs periodically via cron or in background loop to keep server in sync with GitHub

PROJECT_DIR="/root/kimbor"

if [ -d "$PROJECT_DIR" ]; then
  cd "$PROJECT_DIR"
  
  # Fetch remote changes
  git fetch origin main
  
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)
  
  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "🔄 New changes detected on GitHub. Pulling and rebuilding containers..."
    git pull origin main
    docker compose -f docker-compose.prod.yml up -d --build
    echo "✅ Hostinger VPS live deployment updated successfully at $(date)"
  fi
fi
