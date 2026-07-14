# TipoBot — Architecture

A production-oriented platform composed of a Telegram bot, a REST API
backend, and an admin panel, backed by PostgreSQL and Redis, all
orchestrated with Docker Compose.

## Layout

```
tipoBot/
├── backend/     FastAPI REST API (SQLAlchemy 2, Alembic, Redis, JWT)
├── bot/         Aiogram 3 Telegram bot (entry point + notifications only)
├── miniapp/     React + Vite + TypeScript + Ant Design Mobile storefront
├── admin/       React + Vite + TypeScript + Ant Design admin panel
├── database/    Postgres init scripts
├── scripts/     Shared shell/python helper scripts
├── configs/     Environment-specific config templates
├── docker-compose.yml
├── .env.example
└── Makefile
```

Services communicate over a single Docker bridge network (`tipobot_network`):

- `postgres` — primary datastore
- `redis` — cache, Aiogram FSM storage, and per-`telegram_id` JWT cache for
  the bot's backend calls
- `backend` — FastAPI app on port 8000, runs Alembic migrations on startup
- `bot` — Aiogram 3 long-polling bot, talks to `backend` and `redis`
- `miniapp` — Vite dev server on port 5174, the Telegram Mini App storefront
- `admin` — Vite dev server on port 5173, proxies `/api` to `backend`

## Documentation map

This file covers overall system shape. See also:

- [DATABASE.md](DATABASE.md) — schema, conventions, ER diagram
- [API.md](API.md) — REST API conventions, auth, pagination/filtering,
  and the catalog endpoint reference
- [CATALOG.md](CATALOG.md) — deep dive on the Product Catalog Engine
  (PIM): product types, attributes, pricing, inventory, search, import/export
- [ADMIN_PANEL.md](ADMIN_PANEL.md) — the admin panel: layout, dashboard,
  catalog/user/settings screens, cross-cutting UX (shortcuts, context
  menus, saved filters/layouts, optimistic updates), and e2e tests
- [MINI_APP.md](MINI_APP.md) — the Telegram Mini App storefront: catalog
  browsing, cart, checkout, favorites, profile/orders
- [TELEGRAM.md](TELEGRAM.md) — how the bot, Mini App, and backend fit
  together: auth reuse, notifications, recommendations, analytics

## Backend: Clean Architecture layering

`backend/app` is layered so each concern has exactly one place to live:

```
app/
├── models/          SQLAlchemy 2 ORM models (persistence layer)
├── repositories/     One repository per aggregate root — all query building
├── services/         Business logic, orchestrates repositories + cross-cutting concerns
├── schemas/          Pydantic v2 request/response contracts
├── api/v1/           FastAPI routers — thin, delegate to services
├── core/             Config, security, i18n, RBAC-adjacent helpers, logging
├── dependencies/     FastAPI dependency factories (auth, pagination, permissions)
├── middleware/       Locale resolution, request logging
└── exceptions/       Typed domain exceptions -> HTTP responses
```

A request flows **router → service → repository → model**, never
skipping a layer. Routers never touch SQLAlchemy directly; repositories
never contain business rules; services never build raw SQL (that's the
repository's job).

### Generic CRUD, and where it's deliberately bypassed

Most entities (Manufacturer, Unit, Category, ProductType, Collection,
AttributeGroup, ReferenceValue, ProductLabel, ProductDocument,
ProductVideo, and every commerce/content/system entity) are wired with
two small generic building blocks:

- `BaseRepository[ModelType]` (`app/repositories/base.py`) — list with
  pagination/filtering/search/sort, get, create, update, soft-delete.
- `BaseService[Model, CreateSchema, UpdateSchema]` (`app/services/base.py`)
  — thin orchestration on top of a repository; declares `resource` (an
  RBAC/i18n slug) and `search_fields`.
- `build_crud_router()` (`app/api/v1/crud_router.py`) — given a service
  dependency and schemas, wires up `GET /`, `GET /{id}`, `POST /`,
  `PATCH /{id}`, `DELETE /{id}` with permission checks
  (`<resource>.<action>`) and localized OpenAPI summaries, in one call.

**`Product` is the one deliberate exception.** Its router
(`app/api/v1/catalog/product.py`), service (`app/services/catalog/product.py`),
and repository (`app/repositories/catalog/product.py`) are fully custom
— archive/restore/clone, seven bulk-mutation endpoints, price rollback,
scheduled price activation, and a full import/export subsystem don't
fit the five-verb CRUD shape, and forcing them into it would have meant
bolting special cases onto the generic router instead of writing code
that matches what the domain actually needs. See [CATALOG.md](CATALOG.md)
for the full design.

### Translation architecture

Any entity whose text content must be editable per-language (Product,
ProductType, AttributeDefinition, AttributeGroup, Collection,
ProductLabel, ReferenceValue) uses a companion `{entity}_translations`
table (`UNIQUE(parent_id, locale)`) rather than flat `name_en`/`name_ru`
columns or a JSONB blob. This is a deliberate structural choice: adding
a new storefront language later is a data operation (insert rows for
the new locale) with **zero code or schema changes**, which flat
columns or a fixed JSONB shape can't offer. A generic helper module
(`app/services/translation.py`) — `upsert_translations()`,
`translated_field()`, `translations_as_dict()` — is shared by every one
of these entities instead of each reimplementing the same upsert-by-
locale logic. See [CATALOG.md](CATALOG.md) for how this plugs into
`ProductRead.translations`.

### RBAC

`admin_users` → `roles` → `role_permissions` → `permissions`, normalized
(not a bare association table — `role_permissions` carries the same
audit/soft-delete columns as everything else). Every protected endpoint
depends on `require_permission("<resource>.<action>")`
(`app/dependencies/permissions.py`); a Super Admin (`is_superuser=True`)
always bypasses the check. `scripts/seed_rbac.py` is the single source
of truth for which resources/actions exist and which roles get which
grants — run it after adding a new entity's routes.

### Internationalization (i18n)

Three supported locales: `ru` (default), `en`, `uz`. Two independent
i18n surfaces:

- **API-facing**: `app/core/i18n.py` resolves a locale per-request
  (`?lang=`, then `Accept-Language`, then `DEFAULT_LOCALE`) via
  `LocaleMiddleware`, and `translate(key, locale, **params)` reads from
  `app/locales/{ru,en,uz}.json`. Error messages, validation messages,
  and the OpenAPI schema itself (summaries, tag names, parameter
  descriptions — `app/core/openapi_i18n.py`) are all translated this
  way, so `/docs?lang=uz` renders a fully localized Swagger UI.
- **Content-facing**: translatable catalog entities use the companion-
  table pattern described above, independent of the request's locale —
  a `ru`-speaking admin can still edit the `uz` translation of a product.

### Admin panel

`admin/` is a Vite + React + TypeScript + Ant Design SPA. Entity pages
are config-driven: a `CrudPage` component renders a paginated table +
create/edit modal from a `columns`/`fields` declaration
(`FormFieldConfig[]`), and `createResourceHooks()` wires up the
react-query hooks for one API resource in one call. New simple entities
are typically a ~50-line page file; Product's page carries bespoke UI
(bulk selection, archive/restore/clone actions, import/export, and a
richer field set) because its API surface is bespoke too.

### Telegram bot

`bot/` is an Aiogram 3 long-polling bot, deliberately kept lightweight by
design (not a phased-in limitation): it is the entry point into the
[Mini App](MINI_APP.md) and the customer's notification channel, and
**never renders catalog, cart, or checkout UI itself** — see
[TELEGRAM.md](TELEGRAM.md) for the full rationale and the bot ↔ Mini App
↔ backend architecture, including how the bot authenticates against the
backend and how order/status notifications flow.

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
   - Backend API: http://localhost:8000 (docs at `/docs`, `?lang=en|ru|uz`)
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
