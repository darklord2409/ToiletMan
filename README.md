# TipoBot — Hardware Store Telegram E-Commerce Platform

A production-oriented platform composed of a Telegram bot, a REST API backend,
and an admin panel, backed by PostgreSQL and Redis, all orchestrated with
Docker Compose.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — service layout, backend layering,
  RBAC, i18n, translation architecture
- [DATABASE.md](DATABASE.md) — schema, conventions, ER diagram
- [API.md](API.md) — REST conventions, auth, pagination/filtering, endpoint reference
- [CATALOG.md](CATALOG.md) — the Product Catalog Engine (PIM) in depth
- [ADMIN_PANEL.md](ADMIN_PANEL.md) — the admin panel (React/Vite/AntD): layout,
  dashboard, catalog/user/settings screens, shortcuts, e2e tests
- [MINI_APP.md](MINI_APP.md) — the Telegram Mini App storefront (React/Vite/
  Ant Design Mobile): catalog, cart, checkout, profile, e2e tests
- [TELEGRAM.md](TELEGRAM.md) — the complete Telegram integration: bot as
  entry point/notification channel, Mini App as storefront, notifications,
  recommendations, analytics, media library

This file covers day-to-day setup only; see the docs above for how the
system is built.

Services communicate over a single Docker bridge network (`tipobot_network`):

- `postgres` — primary datastore
- `redis` — cache, Aiogram FSM storage, and a per-`telegram_id` JWT cache
  for the bot's backend calls
- `backend` — FastAPI app on port 8000, runs Alembic migrations on startup
- `bot` — Aiogram 3 long-polling bot, talks to `backend` and `redis`
- `miniapp` — Vite dev server on port 5174, the Telegram Mini App storefront
- `admin` — Vite dev server on port 5173, proxies `/api` to `backend`

## Getting started

1. Copy the environment template and fill in real secrets:

   ```
   cp .env.example .env
   ```

   At minimum set `BOT_TOKEN` (from @BotFather) and a strong `SECRET_KEY`.

2. Build and start everything:

   ```
   make up
   ```

3. Check status and logs:

   ```
   make ps
   make logs
   ```

4. Visit:
   - Backend API: http://localhost:8000 (docs at `/docs`)
   - Admin panel: http://localhost:5173

## Database migrations

Migrations run automatically when the `backend` container starts
(`alembic upgrade head`). To create a new migration after changing models:

```
make revision m="describe the change"
make migrate
```

## Development notes

- Backend and bot source directories are bind-mounted into their containers,
  so code edits are picked up without rebuilding the image (restart the
  service to pick up changes, since neither runs an auto-reloader by
  default).
- The admin container keeps `node_modules` in a named volume
  (`admin_node_modules`) so host and container dependencies don't collide.
- Health check endpoints (`/api/v1/health`, `/api/v1/health/db`,
  `/api/v1/health/redis`) confirm connectivity between services.

## Environments

`configs/environments/*.env.example` document the settings that typically
change between `local` and `production`. Copy the relevant values into the
root `.env` file for the target environment.
