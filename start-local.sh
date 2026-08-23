#!/bin/bash
# Kimbor Admin Panel - Local Dev Starter
# Bu skriptni Terminal da ishlatish uchun:
# chmod +x ~/Desktop/kimbor/start-local.sh
# ~/Desktop/kimbor/start-local.sh

echo ""
echo "🚀 Kimbor Admin Panel - Local Dev Mode"
echo "======================================="
echo ""

cd "$(dirname "$0")"

# 1. Port 3000 ni tozalash
echo "🔄 Port 3000 ni tozalash..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# 2. pnpm ni topish
PNPM_PATH=""
for p in \
  "$(which pnpm 2>/dev/null)" \
  "$HOME/.local/share/pnpm/pnpm" \
  "/opt/homebrew/bin/pnpm" \
  "/usr/local/bin/pnpm" \
  "$(ls $HOME/Library/pnpm/pnpm 2>/dev/null)"
do
  if [ -x "$p" ]; then
    PNPM_PATH="$p"
    break
  fi
done

if [ -z "$PNPM_PATH" ]; then
  echo "⚠️  pnpm topilmadi. O'rnatilmoqda..."
  # corepack orqali o'rnatishga urinish
  if command -v corepack &>/dev/null; then
    corepack enable
    corepack prepare pnpm@latest --activate
    PNPM_PATH=$(which pnpm 2>/dev/null)
  else
    # npm bilan fallback
    npm install -g pnpm 2>/dev/null
    PNPM_PATH=$(which pnpm 2>/dev/null)
  fi
fi

if [ -z "$PNPM_PATH" ]; then
  echo "❌ pnpm o'rnatib bo'lmadi. npm bilan davom etilmoqda..."
  USE_NPM=1
fi

# 3. Dependencies o'rnatish (agar node_modules yo'q bo'lsa)
if [ ! -d "node_modules" ]; then
  echo "📦 Dependencies o'rnatilmoqda (bir martalik, ~1 daqiqa)..."
  if [ -n "$PNPM_PATH" ]; then
    "$PNPM_PATH" install
  else
    npm install --prefix apps/webapp
  fi
fi

# 4. Webapp dev serverini ishga tushirish
echo ""
echo "✅ Dev server ishga tushmoqda..."
echo "🌐 Brauzerda oching: http://localhost:3000"
echo "👑 Super Admin sifatida avtomatik kiradi!"
echo ""

if [ -n "$PNPM_PATH" ]; then
  "$PNPM_PATH" --filter @kimbor/webapp dev
else
  cd apps/webapp && npx vite --port 3000
fi
