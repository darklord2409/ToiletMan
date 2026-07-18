#!/usr/bin/env sh
set -e

python /app/scripts/wait_for.py "${POSTGRES_HOST}:${POSTGRES_PORT}" --timeout 60
python /app/scripts/wait_for.py "${REDIS_HOST}:${REDIS_PORT}" --timeout 60

alembic upgrade head

exec gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers "${WEB_CONCURRENCY:-2}" \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile -
