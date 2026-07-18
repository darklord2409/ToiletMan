#!/usr/bin/env bash
# Restores a Postgres dump produced by backup_db.sh. DESTRUCTIVE: drops and
# recreates every object in the target database via `pg_dump --clean`'s
# embedded DROP statements. Confirms before running.
#
# Usage: ./scripts/restore_db.sh backups/tipobot_20260101_030000.sql.gz
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
dump_file="${1:?Usage: $0 <path-to-dump.sql.gz>}"

if [ ! -f "$dump_file" ]; then
    echo "File not found: $dump_file" >&2
    exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "This will OVERWRITE the '${POSTGRES_DB}' database with the contents of:"
echo "  $dump_file"
read -r -p "Type the database name (${POSTGRES_DB}) to confirm: " confirm
if [ "$confirm" != "$POSTGRES_DB" ]; then
    echo "Aborted."
    exit 1
fi

echo "[$(date -Iseconds)] Restoring..."
gunzip -c "$dump_file" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$(date -Iseconds)] Restore complete. Consider restarting backend/bot to clear any stale connections."
