#!/usr/bin/env sh
set -e

python /app/scripts/wait_for.py "${REDIS_HOST}:${REDIS_PORT}" --timeout 60
python /app/scripts/wait_for.py "${BACKEND_HOST}:${BACKEND_PORT}" --timeout 60

exec python -m app.main
