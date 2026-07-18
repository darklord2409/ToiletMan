# Deployment Guide

This project runs locally today via `docker-compose.yml` (dev servers, bind
mounts, hot reload) and a temporary Cloudflare quick tunnel for the Mini
App's public HTTPS URL. This document covers moving it to a real server.

## What's already prepared

- `docker-compose.prod.yml` — built images only, no source bind-mounts,
  restart policies, health checks.
- `backend/Dockerfile.prod`, `bot/Dockerfile.prod` — slim images (no
  test/lint tooling), backend served by gunicorn + uvicorn workers instead
  of a single dev process.
- `admin/Dockerfile.prod`, `miniapp/Dockerfile.prod` — multi-stage builds:
  Vite production build, served as static files by nginx (with `/api` and
  `/media` reverse-proxied to the backend, mirroring the dev Vite proxy so
  the frontend code needs no changes).
- `.env.example` — every var annotated with what to change for production.
- `scripts/backup_db.sh` / `scripts/restore_db.sh` — Postgres dump/restore.
- `.github/workflows/ci.yml` — runs backend/bot tests + admin/miniapp
  typecheck/lint/build on every push and PR to `master`.

## 1. Get a server

Minimum realistic spec for this stack (Postgres + Redis + backend + bot +
two static frontends): **2 vCPU / 4 GB RAM**, any recent Ubuntu/Debian LTS.
Install Docker + the Compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in after this
docker compose version            # should print v2.x
```

## 2. Get a domain (optional but recommended)

Telegram **requires HTTPS** for both the Mini App URL and doesn't care about
the admin panel's URL at all — so strictly the Mini App needs a real
hostname with a valid cert. Point DNS at your server once you have one:

```
shop.example.com   A   <server-ip>
admin.example.com  A   <server-ip>
```

Until a domain exists, you can keep using a Cloudflare quick tunnel pointed
at the production `miniapp` container's port instead of the dev one — same
procedure as today, just a different target port.

## 3. Clone and configure

```bash
git clone https://github.com/darklord2409/ToiletMan.git
cd ToiletMan
cp .env.example .env
```

Edit `.env` — at minimum:

- `SECRET_KEY` — generate with `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`
- `POSTGRES_PASSWORD` — a real random password
- `BOT_TOKEN` — from @BotFather
- `WEBAPP_URL` — the real HTTPS Mini App URL once you have one
- `CORS_ORIGINS` — your real admin/shop origins, e.g.
  `https://admin.example.com,https://shop.example.com`
- `ENVIRONMENT=production`, `DEBUG=false`

## 4. Start the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
```

Confirm health:

```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/health/db
curl http://localhost:8000/api/v1/health/redis
```

At this point `admin`/`miniapp` are reachable on `ADMIN_PORT`/`MINIAPP_PORT`
directly (plain HTTP, no domain) — enough to smoke-test the deployment
before wiring up a domain.

## 5. Put a reverse proxy + HTTPS in front (once you have a domain)

**Caddy** is the easiest option here — it provisions and renews Let's
Encrypt certificates automatically from a ~10-line config, no certbot/cron
needed. Add this as its own service (not included in
`docker-compose.prod.yml` by default, since it needs a real domain to be
useful):

```yaml
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddyfile
      - caddy_data:/data
    networks:
      - tipobot_network
```

`Caddyfile`:

```
shop.example.com {
    reverse_proxy miniapp:80
}

admin.example.com {
    reverse_proxy admin:80
}
```

(Remove the `ports:` mappings on `admin`/`miniapp` in
`docker-compose.prod.yml` once Caddy is fronting them — no reason to expose
plain-HTTP ports directly once there's a real reverse proxy.)

After this is up, update `WEBAPP_URL` in `.env` to `https://shop.example.com`
and force-recreate the bot so it picks up the new menu button URL:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate bot
```

Verify Telegram actually has the new URL (don't just trust the logs):

```bash
curl "https://api.telegram.org/bot<TOKEN>/getChatMenuButton"
```

## 6. Backups

```bash
./scripts/backup_db.sh          # writes backups/tipobot_<timestamp>.sql.gz
```

Add to cron for daily backups:

```
0 3 * * * cd /path/to/ToiletMan && ./scripts/backup_db.sh >> backups/backup.log 2>&1
```

Restore (destructive — prompts for confirmation):

```bash
./scripts/restore_db.sh backups/tipobot_20260101_030000.sql.gz
```

`backups/` is gitignored — copy dumps off-server (e.g. to S3/another host)
if the server itself could be lost.

## 7. Redeploying after a code change

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

This rebuilds only the services whose Dockerfile/context changed and
restarts them; `alembic upgrade head` runs automatically on backend startup
(see `backend/scripts/entrypoint.prod.sh`).

## 8. Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f bot
```

## Known gaps / things to revisit later

- No secrets manager — `.env` is plain text on the server's disk. Fine for
  a single-server setup; revisit if this ever needs multiple environments
  or a team with varying access levels.
- No automated off-server backup upload — `backup_db.sh` writes locally
  only.
- No monitoring/alerting stack (e.g. Sentry, Uptime Kuma) — not set up;
  add if/when uptime actually matters enough to page someone.
- `backend/uploads/` product images are committed to git (a pre-existing
  decision from before this deployment work) — fine at current scale, but
  reconsider (e.g. S3 + `UPLOAD_DIR` swap, already noted as supported in
  `app/core/config.py`) if the repo size becomes a problem.
