FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY backend/ .
RUN chmod +x /app/scripts/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["sh", "/app/scripts/entrypoint.sh"]
