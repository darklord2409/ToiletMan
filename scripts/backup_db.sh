#!/usr/bin/env bash
# Dumps the production Postgres database to a timestamped, gzip-compressed
# file. Run from the repo root, e.g. via a daily cron job:
#   0 3 * * * cd /path/to/tipoBot && ./scripts/backup_db.sh >> backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

mkdir -p "$BACKUP_DIR"

set -a
# shellcheck disable=SC1091
source .env
set +a

timestamp=$(date +%Y%m%d_%H%M%S)
out_file="${BACKUP_DIR}/tipobot_${timestamp}.sql.gz"

echo "[$(date -Iseconds)] Backing up ${POSTGRES_DB} -> ${out_file}"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
    | gzip > "$out_file"

echo "[$(date -Iseconds)] Wrote $(du -h "$out_file" | cut -f1)"

# Prune backups older than RETENTION_DAYS.
find "$BACKUP_DIR" -name 'tipobot_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -Iseconds)] Done"
