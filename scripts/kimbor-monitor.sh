#!/bin/bash
# =============================================================================
# kimbor-monitor.sh — Server & Service Health Monitoring Script
#
# Runs via Cron every 5 minutes:
#   */5 * * * * /root/kimbor/scripts/kimbor-monitor.sh >> /root/kimbor/backups/monitor.log 2>&1
# =============================================================================

set -euo pipefail

SUPER_ADMIN_CHAT_ID="6355516451"
BOT_TOKEN="${BOT_TOKEN:-8687073267:AAFPSct-K6SBx8eZG1zTCe0uUt4NJ_HY7dQ}"
ALERT_SENT_FILE="/tmp/kimbor_alert_sent"

send_telegram_alert() {
  local msg="$1"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚨 SENT TELEGRAM ALERT: $msg"
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${SUPER_ADMIN_CHAT_ID}" \
    -d "text=🚨 *KIM BOR SERVIS OGOHLANTIRISHI*\n\n${msg}" \
    -d "parse_mode=Markdown" > /dev/null || true
}

# 1. DISK USAGE CHECK (Alert if > 80%)
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
  send_telegram_alert "⚠️ Server disk to'ldi! Ishlatilgan: ${DISK_USAGE}%"
fi

# 2. DOCKER CONTAINERS CHECK
for CONTAINER in kimbor_api kimbor_bot kimbor_webapp kimbor_postgres kimbor_redis kimbor_caddy; do
  STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not_found")
  if [ "$STATUS" != "running" ]; then
    send_telegram_alert "⚠️ Контейнер to'xtab qoldi: *${CONTAINER}* (Status: ${STATUS})"
  fi
done

# 3. HTTP HEALTH CHECK (API /health)
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://olmaliq.online/api/health || echo "000")
if [ "$API_HEALTH" != "200" ]; then
  send_telegram_alert "⚠️ API javob bermayapti! HTTP Status: ${API_HEALTH}"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Health check OK (Disk: ${DISK_USAGE}%, API HTTP: ${API_HEALTH})"
