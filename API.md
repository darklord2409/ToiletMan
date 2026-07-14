# TipoBot API

REST API conventions for the FastAPI backend, plus a reference for the
Product Catalog Engine's endpoints. For interactive, always-current docs,
run the stack and open `/docs` (Swagger UI) or `/redoc` — both are
localized per `?lang=ru|en|uz` (default `ru`). This document covers the
conventions those generated docs assume; see [CATALOG.md](CATALOG.md) for
the business logic behind the catalog endpoints and [DATABASE.md](DATABASE.md)
for the schema underneath them.

All routes below are relative to `API_V1_PREFIX` (`/api/v1` by default).

## Authentication

- `POST /auth/login` — form-encoded `username`/`password`, returns
  `{ access_token, refresh_token, token_type }` for an admin user.
- `POST /auth/refresh` — exchanges a refresh token for a new access token.
- `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me/language`,
  `POST /auth/change-password`, `POST /auth/password-reset/request`,
  `POST /auth/password-reset/confirm`.
- `POST /customer-auth/*` — the parallel, separately-scoped flow for
  storefront customers (email/password, phone, Telegram login).

Every route under `/catalog`, `/users`, `/commerce`, `/content`, `/system`
requires a valid admin access token (`Authorization: Bearer <token>`) —
enforced at the router level (`protected_router` in
`app/api/v1/router.py`), independent of any per-action RBAC check.

## Authorization (RBAC)

Beyond authentication, most mutating and many read endpoints also require
a specific permission, checked via `require_permission("<resource>.<action>")`
(`app/dependencies/permissions.py`). `<resource>` is the same slug used in
the URL prefix and in `scripts/seed_rbac.py` (e.g. `products`, `product-types`,
`reference-values`); `<action>` is one of `read`/`create`/`update`/`delete`,
plus two standalone permissions not tied to a resource's CRUD shape:
`prices.update` (bulk price adjustment, price rollback, scheduled price
activation) and `reports.read`. A Super Admin (`is_superuser=True`) always
passes every check. A failed check returns `403` with a localized message
naming the missing permission.

## Pagination, sorting, search, filtering

Every list endpoint (generic CRUD and Product's custom router alike)
shares the same query contract:

| Param | Meaning |
|---|---|
| `page` (default 1), `page_size` (default 20, max 100) | Standard offset pagination |
| `sort_by`, `sort_order` (`asc`\|`desc`) | Sort by any column the entity's repository allows |
| `search` | Free-text search across that entity's `search_fields` (Product uses the GIN-indexed `search_vector` instead of `ILIKE` — see [CATALOG.md](CATALOG.md)) |
| entity-specific filters | e.g. `category_id`, `manufacturer_id`, `product_type_id`, `collection_id`, `product_status` for products |

Responses are always:

```json
{
  "items": [ /* ... */ ],
  "meta": { "page": 1, "page_size": 20, "total_items": 42, "total_pages": 3 }
}
```

`product_status` (not `status`) is Product's status filter param —
renamed at the API layer specifically to avoid colliding with Order's
`status` filter in the shared OpenAPI-translation lookup table
(`app/core/openapi_i18n.py`); both still map to each entity's own
`status` column internally.

## Error responses

A single global handler translates every `AppError` subclass into:

```json
{ "detail": "Localized error message" }
```

Validation errors (422) additionally include a translated `errors` array.
Language comes from `?lang=`, then `Accept-Language`, then `ru`.

## Generic CRUD shape

Any entity built on `build_crud_router()` (see [ARCHITECTURE.md](ARCHITECTURE.md))
exposes exactly:

```
GET    /{resource}            list (paginated)
GET    /{resource}/{id}       get one
POST   /{resource}            create
PATCH  /{resource}/{id}       partial update
DELETE /{resource}/{id}       soft delete (204)
```

This covers: `manufacturers`, `units`, `categories`, `product-images`,
`attribute-definitions`, `product-attributes`, `attribute-groups`,
`attribute-sets`, `attribute-set-items`, `product-types`, `collections`,
`reference-values`, `product-labels`, `product-label-assignments`,
`product-documents`, `product-videos`, `product-recommendations`, plus
every commerce/users/content/system entity.

`product-recommendations` (`product_id`, `recommended_product_id`,
`relation_type`: `related`\|`accessory`\|`frequently_bought_together`,
`sort_order`) is the admin-curated half of the storefront's product
recommendations — see [TELEGRAM.md](TELEGRAM.md#recommendations) for how
it combines with the computed (same-collection/similar) groups the Mini
App actually renders.

`PATCH /orders/{id}` has a side effect beyond the update itself: a
`status` or `manager_notes` change fires a Telegram notification to the
order's customer (and, for a brand-new order, to every configured manager)
via `NotificationService` — see [TELEGRAM.md](TELEGRAM.md#notifications).
This never blocks or fails the request; a Telegram delivery error is
logged, not raised.

## Product endpoints (custom router)

`Product` does not use the generic shape — see [CATALOG.md](CATALOG.md) for
why. Full surface (`app/api/v1/catalog/product.py`), all under `/products`:

| Method & path | Permission | Purpose |
|---|---|---|
| `GET /products` | `products.read` | Paginated list with filters/search/sort |
| `GET /products/filters` | `products.read` | Storefront facets: price range, manufacturer/collection/category counts, scoped to `status=active` |
| `GET /products/{id}` | `products.read` | Get one |
| `POST /products` | `products.create` | Create (accepts `translations`) |
| `PATCH /products/{id}` | `products.update` | Partial update (accepts `translations`) |
| `DELETE /products/{id}` | `products.delete` | Soft delete (equivalent to `bulk/delete` with one id) |
| `POST /products/{id}/archive` | `products.update` | Set `status=ARCHIVED` |
| `POST /products/{id}/restore` | `products.update` | Set `status=ACTIVE` |
| `POST /products/{id}/clone` | `products.create` | Deep-clone a product (`{new_sku, new_slug, new_name?}`) |
| `POST /products/{id}/price-rollback` | `prices.update` | Revert to a past `price_history` row (`{price_history_id}`) |
| `POST /products/apply-scheduled-prices` | `prices.update` | Activate any due `future_price` (idempotent, admin-triggered — see [CATALOG.md](CATALOG.md)) |
| `POST /products/bulk/status` | `products.update` | `{product_ids, status}` |
| `POST /products/bulk/manufacturer` | `products.update` | `{product_ids, manufacturer_id}` |
| `POST /products/bulk/category` | `products.update` | `{product_ids, category_id}` |
| `POST /products/bulk/collection` | `products.update` | `{product_ids, collection_id}` |
| `POST /products/bulk/update` | `products.update` | `{product_ids, fields}` — arbitrary field/value map |
| `POST /products/bulk/delete` | `products.delete` | `{product_ids}` — bulk soft delete |
| `POST /products/bulk/price-adjust` | `prices.update` | `{product_ids, mode: percentage\|fixed, direction: increase\|decrease, value}` |
| `POST /products/import/preview` | `products.create` | Multipart file (`?mode=full\|price_only\|stock_only`), dry-run, no writes |
| `POST /products/import/commit` | `products.create` | Same as preview plus `?atomic=true\|false`, actually writes |
| `GET /products/export` | `products.read` | `?fmt=csv\|xlsx`, optional `product_ids`/filters/`search`, streams a file |

All bulk endpoints return `{ "updated_count": <int> }`. All mutating
endpoints record an audit log entry (`app/core/audit.py`) and, where the
price changes, a `price_history` row.

## Localized OpenAPI

`/docs`, `/redoc`, and `/openapi.json` all accept `?lang=ru|en|uz` and
re-derive every summary, tag name, and parameter description for that
locale at request time (`app/core/openapi_i18n.py`) — nothing is baked in
at route-decoration time. Adding a new custom (non-CRUD-shaped) endpoint
requires registering its `(path, method)` in `_EXPLICIT_SUMMARY_KEYS`,
and any new query parameter name in `_QUERY_PARAM_KEYS` (watch for name
collisions across entities — see the `product_status` example above).
