#!/usr/bin/env bash
set -e

# Daily Automated PostgreSQL Backup Script
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/kimbor_db_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "📦 Starting daily database backup: ${BACKUP_FILE}..."

docker exec -t kimbor_postgres pg_dump -U kimbor -d kimbor_db | gzip > "${BACKUP_FILE}"

echo "✅ Backup successfully created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Keep last 30 days of backups, delete older
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +30 -delete
echo "🧹 Cleaned up backups older than 30 days."
