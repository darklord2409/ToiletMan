#!/usr/bin/env sh
set -e

python /app/scripts/wait_for.py "${POSTGRES_HOST}:${POSTGRES_PORT}" --timeout 60
python /app/scripts/wait_for.py "${REDIS_HOST}:${REDIS_PORT}" --timeout 60

alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
