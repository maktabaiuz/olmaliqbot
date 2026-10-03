#!/bin/bash
# =============================================================================
# kimbor-backup.sh — PostgreSQL kunlik zaxira nusxasi
#
# Maqsad : /root/kimbor/backups/ papkasiga .sql.gz saqlanadi
#           Oxirgi 30 kun saqlanib qoladi, eskilari o'chiriladi
#
# O'rnatish (serverda bir marta):
#   chmod +x /root/kimbor/scripts/kimbor-backup.sh
#   crontab -e
#   Quyidagi qatorni qo'shing (har kuni soat 03:00 da):
#   0 3 * * * /root/kimbor/scripts/kimbor-backup.sh >> /root/kimbor/backups/backup.log 2>&1
# =============================================================================

set -euo pipefail

BACKUP_DIR="/root/kimbor/backups"
KEEP_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="kimbor_${TIMESTAMP}.sql.gz"
CONTAINER="kimbor_postgres"
# cron .env'ni o'qimaydi — qiymatlarni o'zimiz olamiz (2026-10-03: avval
# noto'g'ri standart nom tufayli zaxira umuman olinmagan edi).
[ -f /root/kimbor/.env ] && set -a && . /root/kimbor/.env && set +a
DB_NAME="${POSTGRES_DB:-kimbor_db}"
DB_USER="${POSTGRES_USER:-kimbor}"

# Zaxira papkasini yaratish (mavjud bo'lmasa)
mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Zaxira boshlanmoqda: $FILENAME"

# Docker konteyner ichidan pg_dump ishga tushirish va gzip bilan siqish
docker exec "$CONTAINER" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password \
  --format=plain \
  | gzip > "$BACKUP_DIR/$FILENAME"

# Bo'sh/yarim zaxira — xato (pipefail pg_dump xatosini ushlaydi)
if [ "$(gzip -dc "$BACKUP_DIR/$FILENAME" | head -c 2000 | grep -c 'PostgreSQL database dump')" -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Zaxira yaroqsiz: $FILENAME"; rm -f "$BACKUP_DIR/$FILENAME"; exit 1
fi
FILESIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Zaxira yaratildi: $FILENAME ($FILESIZE)"

# 30 kundan eski zaxiralarni o'chirish
DELETED=$(find "$BACKUP_DIR" -name "kimbor_*.sql.gz" -mtime +$KEEP_DAYS -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🗑  $DELETED ta eski zaxira o'chirildi (>${KEEP_DAYS} kun)"
fi

# Joriy zaxiralar soni
TOTAL=$(find "$BACKUP_DIR" -name "kimbor_*.sql.gz" | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📦 Jami zaxiralar: $TOTAL ta"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ─────────────────────────────────────────────"
