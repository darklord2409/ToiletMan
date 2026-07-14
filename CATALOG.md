# Product Catalog Engine (PIM)

The product catalog is built as a Product Information Management system,
not a simple CRUD screen over one `products` table: product structure
(what specifications a product has) is data-driven per product type,
reference dictionaries are shared and normalized instead of duplicated
free text, pricing and inventory carry their own lifecycles, and search/
filtering/import/export are built for a 100,000+ row catalog rather than
a demo dataset. This document explains every subsystem and the reasoning
behind it. See [DATABASE.md](DATABASE.md) for table-level schema and
[API.md](API.md) for the REST surface.

## 1. Product Types drive available specifications

A `ProductType` (e.g. "Kitchen Faucet", "Mirror", "Bathroom Cabinet")
doesn't hard-code its own fields. Instead:

```
ProductType --(attribute_set_id)--> AttributeSet --(AttributeSetItem)--> AttributeDefinition
```

- **`AttributeDefinition`** is the global, reusable declaration of one
  specification: code, display name, `data_type`
  (`string`/`number`/`boolean`/`date`/`reference`), optional `unit_id`
  (e.g. "Height" measured in `cm`), optional `reference_type` (for
  `reference`-typed attributes — see §2), and validation rules
  (`validation_regex`, `min_value`, `max_value`). It's grouped for
  display purposes under an `AttributeGroup` (e.g. "Dimensions",
  "Materials & Finish").
- **`AttributeSet`** is a named, reusable bundle of attribute
  definitions (e.g. "Faucet Specs"). Several product types with
  overlapping specs (Kitchen/Bathroom/Outdoor Faucet) can share one set
  instead of each duplicating the same attribute list.
- **`AttributeSetItem`** is the join row carrying **per-set** metadata:
  `sort_order`, `is_required`, `is_visible`, `default_value`. This is
  deliberately separate from `AttributeDefinition` — the same "Material"
  attribute can be required in one set and optional in another, and
  changing its display order in one set doesn't affect any other set
  that also uses it.
- **`ProductType`** points at exactly one `AttributeSet`. This is what
  "changing a product's type automatically updates its specifications"
  means concretely: the type doesn't own attributes directly, it owns
  the *set* of attributes.

### Worked example (from the original spec)

| Product Type | Attribute Set | Example attributes |
|---|---|---|
| Kitchen Faucet | Faucet Specs | Material, Color, Height, Spout Length, Installation Type, Aerator, Cartridge, Warranty, Country |
| Mirror | Mirror Specs | Width, Height, Lighting, Heating, Sensor, Frame, Power |
| Bathroom Cabinet | Cabinet Specs | Width, Height, Depth, Body Material, Front Material, Number of Drawers, Soft Close |

`scripts/seed_catalog.py` seeds exactly these product types and attribute
sets (see §16).

### Auto-sync on type change

`ProductService._sync_attributes_to_product_type()` runs on every
`create()` and whenever `update()` changes `product_type_id`:

1. Loads the new type's `AttributeSet` and its `AttributeSetItem`s.
2. Deletes any existing `ProductAttribute` row whose
   `attribute_definition_id` is **not** in the new set (values for
   specs that no longer apply are dropped, not orphaned).
3. For any attribute in the new set that the product doesn't have a
   value for yet *and* the set item declares a `default_value`, seeds a
   `ProductAttribute` row with that default.

This runs inside the same transaction as the create/update, so a
product's visible spec list is always consistent with its current type
by the time the response is returned.

## 2. The EAV value layer and reference data

`ProductAttribute` is the EAV row: one per `(product, attribute_definition)`
pair, with one typed column populated depending on the definition's
`data_type` — `value_string`, `value_number`, `value_boolean`,
`value_date`, or (for `data_type=reference`) `value_reference_id`.

**`ReferenceValue`** is one generic table backing ten conceptually
distinct dictionaries — materials, colors, countries, finishes,
installation types, shapes, warranty periods, connection types, thread
sizes, water outlet types — discriminated by a `reference_type` column
(`UNIQUE(reference_type, code)`). An `AttributeDefinition` with
`data_type=reference` names which dictionary it draws from via its own
`reference_type`; a `ProductAttribute` value then points at one
`ReferenceValue` row instead of storing free text. Renaming "Chrome" once
updates every product that uses it, and the admin panel's
`ReferenceValuesPage` offers a curated dropdown of the ten known
`reference_type` values for editing.

## 3. Collections

A `Collection` (e.g. Grohe's "Essence" collection) belongs to one
`Manufacturer` and groups products **across product types** — a faucet,
a mirror, a cabinet, and accessories can all belong to the same
collection, which is what lets a storefront show "browse the complete
Essence line" regardless of what kind of product each item is.
`Product.collection_id` is optional and nullable (`ON DELETE SET NULL`).

## 4. The Product model

Beyond the identifying fields (`sku`, `barcode`, `slug`, `name`,
`description`) and the required FKs (`category_id`, `unit_id`,
`product_type_id`, plus optional `manufacturer_id`/`collection_id`):

- **`status`** is a three-state enum — `DRAFT` / `ACTIVE` / `ARCHIVED` —
  replacing a plain `is_active` boolean from the pre-catalog schema.
  Draft products can be fully configured (images, attributes, pricing)
  before being made visible; archived products are excluded from
  storefront filters/facets (`get_filters()` only scopes `status=ACTIVE`)
  without being soft-deleted, so their order history and audit trail
  stay intact.
- **Pricing**: `price` (current), `compare_at_price` ("was" price for
  showing a strikethrough discount), `cost_price` (internal margin
  tracking), `sale_price` (promotional price), and a **scheduled future
  price**: `future_price` + `future_price_activates_at`. See §6.
- **Inventory**: `stock_quantity`, `reserved_quantity` (held by
  unfulfilled orders/carts), `is_unlimited_stock` (bypasses quantity
  checks entirely for made-to-order or drop-shipped items),
  `low_stock_threshold`. See §7 for the derived availability fields.
- **SEO**: `canonical_url_override` plus a free-form `seo` JSONB blob
  (meta title/description overrides, OpenGraph fields, structured-data
  hints) for fields that don't need their own column and vary by use
  case. Slugs double as the canonical URL path when no override is set.
- **`search_vector`**: a stored, GIN-indexed `tsvector` — see §8.

## 5. Localization (translations)

Every catalog entity whose *content* (not structure) needs to vary by
language — `Product`, `ProductType`, `AttributeDefinition`,
`AttributeGroup`, `Collection`, `ProductLabel`, `ReferenceValue` — has a
companion `{entity}_translations` table: `(parent_id FK, locale,
<translatable columns>)`, `UNIQUE(parent_id, locale)`, `ON DELETE CASCADE`
from the parent. The base entity's own columns (e.g. `Product.name`) hold
the **default-locale** (`ru`) content and are what's indexed for search
and used as a fallback; the translation rows hold **overrides** for other
locales.

This is the structural answer to "must support ru/en/uz and allow adding
more languages later without code changes": adding a language is inserting
rows for a new `locale` value, nothing else — no new column, no migration,
no redeploy.

Three shared pieces (`app/services/translation.py`) back every one of
these seven entities identically:

```python
await upsert_translations(
    session,
    translation_model=ProductTranslation,
    parent_fk_field="product_id",
    parent_id=product.id,
    translations={"en": {"name": "Cordless Drill"}, "uz": {"name": "Simsiz drel"}},
)
```

- `upsert_translations()` — insert-or-update one row per `(parent, locale)`.
- `translated_field()` — read one field for one locale with a fallback.
- `translations_as_dict(rows, fields)` — reshape a loaded relationship
  into `{locale: {field: value}}`, which is exactly the shape every
  `*Read` schema's `translations` property exposes over the API (via a
  Pydantic `field_validator(mode="before")` that detects whether it's
  reshaping an ORM relationship or passing through an already-dict
  request payload).

The admin panel edits these as flat, dotted field names
(`translations.en.name`, `translations.uz.description`, ...) that
react-hook-form reassembles into the nested `{locale: {field: value}}`
shape on submit — no bespoke per-locale form widget needed.

**Known limitation**: full-text search (§8) only indexes the base
(`ru`) columns. Searching by an `en`/`uz` translation override isn't
covered yet — see §16.

## 6. Pricing and price history

Every price change is recorded, never silently overwritten:

- `ProductService.create()` writes an initial `PriceHistory` row.
- `ProductService.update()` diffs `price` before/after and writes a row
  only if it actually changed, tagging `old_price`/`new_price`/`changed_by_id`.
- `bulk_price_adjust(mode, direction, value)` computes a new price per
  product in Python (percentage-of-current or fixed-amount,
  increase/decrease, clamped at 0, rounded to 2 decimals), applies all of
  them in **one** `UPDATE ... WHERE id = ANY(...)`-style executemany
  round trip (`ProductRepository.bulk_set_prices`, SQLAlchemy `bindparam`
  list-of-dicts), and still writes one `PriceHistory` row per product —
  bulk performance without losing per-row auditability.
- `rollback_price(product_id, price_history_id)` reads a past
  `PriceHistory` row and sets `Product.price` back to its `old_price`,
  then writes a **new** `PriceHistory` row documenting the rollback
  itself. History is append-only; nothing is ever edited or deleted.
- **Scheduled future price**: `future_price` + `future_price_activates_at`
  let an admin queue a price change ahead of time (e.g. a sale that
  starts at midnight). `POST /products/apply-scheduled-prices` is an
  idempotent, admin-triggered endpoint that activates any product whose
  activation time has passed — moving `future_price` into `price` and
  clearing both future-price fields, with a `PriceHistory` row. This
  project has no background task scheduler yet, so activation is
  triggered on demand rather than by a cron job; see §16.

## 7. Inventory

`stock_quantity` and `reserved_quantity` are stored; two response-only
`@computed_field` properties on `ProductRead` derive the rest so clients
never reimplement this logic:

- **`available_quantity`** = `stock_quantity` (if `is_unlimited_stock`)
  else `max(stock_quantity - reserved_quantity, 0)`.
- **`availability_status`** = `"unlimited"` if unlimited stock, else
  `"out_of_stock"` (available ≤ 0), `"low_stock"` (available ≤
  `low_stock_threshold`, when set), or `"in_stock"`.

## 8. Full-text search at scale

`Product.search_vector` is a Postgres `GENERATED ALWAYS AS (...) STORED`
column (`sqlalchemy.Computed(..., persisted=True)`):
`to_tsvector('russian', name || sku || slug || barcode || description)`,
backed by a GIN index. `ProductRepository._apply_search()` overrides the
generic repository's `ILIKE '%term%'` search with
`search_vector @@ plainto_tsquery('russian', :search)`.

This matters specifically at 100k+ rows: a leading-wildcard `ILIKE` can't
use any index and scans linearly with table size; the generated,
GIN-indexed `tsvector` answers in milliseconds regardless of catalog
size, and Postgres maintains it automatically on every write — no
application code ever recomputes it.

## 9. Filters and facets

`GET /products/filters` (storefront-facing, scoped to `status=ACTIVE`)
returns price min/max and per-manufacturer/collection/category counts
for the current (optional `category_id`/`product_type_id`-scoped) result
set — the data a storefront needs to render dynamic facet lists ("Price:
$10–$200", "Manufacturer: Grohe (14), Hansgrohe (9)"). Custom-attribute
faceting (filtering by an `AttributeDefinition` marked `is_filterable`)
is schema-ready (`AttributeDefinition.is_filterable` exists) but the
facet endpoint itself doesn't yet aggregate over `ProductAttribute` —
see §16.

## 10. Images, documents, videos, labels

- **`ProductImage`**: one row per image, `sort_order` + `is_primary` for
  the main image, unlimited per product, drag-and-drop reordering is a
  client-side concern (persisted via updating `sort_order`). Thumbnail
  generation and S3-backed storage are architecture-ready (`url` is a
  plain string column — swapping local storage for S3 URLs is a
  storage-layer change, not a schema change) but not implemented — see §16.
- **`ProductDocument`**: `document_type` enum (manual, certificate,
  warranty card, installation instructions, exploded diagram) + `title`,
  `file_url`, `mime_type`, `size_bytes`, `sort_order`.
- **`ProductVideo`**: `video_type` enum (YouTube, MP4, external) + `url`,
  `title`, `thumbnail_url`, `sort_order`.
- **`ProductLabel`** + **`ProductLabelAssignment`**: labels ("New",
  "Bestseller", "Sale", "Recommended", "Sales Leader", "Limited Edition")
  are admin-creatable rows (`code`, `badge_color`, translations), not a
  fixed enum — adding a new badge is a data operation. The assignment
  table is a plain M2M join (`UNIQUE(product_id, product_label_id)`), so
  a product can carry several labels at once.

All four are separate top-level admin pages (matching the existing
image/attribute pages' precedent), not tabs inside the product form.

## 11. Bulk operations

All bulk endpoints take `{product_ids: [...], ...}` and return
`{updated_count}`:

- `bulk/status`, `bulk/manufacturer`, `bulk/category`, `bulk/collection`
  — single-field bulk updates via one `UPDATE ... WHERE id IN (...)`
  (`ProductRepository.bulk_set_fields`).
- `bulk/update` — arbitrary `{field: value}` map, same mechanism.
- `bulk/delete` — bulk soft delete (`deleted_at = now()`).
- `bulk/price-adjust` — see §6.

Every bulk mutation writes one audit log entry containing the full list
of affected `product_ids` plus whatever changed (`ProductService._bulk_audit`).

## 12. Import / export engine

`ProductImportExportService` (`app/services/catalog/product_import_export.py`)
handles Excel (`.xlsx`) and CSV via `openpyxl` + the stdlib `csv` module.

- **Reference resolution**: before validating any row, it preloads every
  slug/code → id mapping it will need (categories by slug, manufacturers
  by slug, units by symbol, product types by code, collections by code,
  existing SKUs) into an in-memory `_ReferenceCache` — one query per
  dictionary instead of one query per row, which is what makes
  thousand-row imports practical.
- **Three modes**: `full` (create-or-update by SKU), `price_only`,
  `stock_only`. The latter two explicitly reject rows whose SKU doesn't
  already exist — they're guardrails against accidentally bulk-creating
  products from a price sheet.
- **Preview vs. commit**: `preview_import()` runs full validation
  (missing fields, unknown reference codes, duplicate SKUs within the
  file) and returns a per-row `{action: create|update|skip, errors}`
  report with **zero writes** — a true dry run. `commit_import()`
  re-validates and then actually writes, going through
  `ProductService.create()`/`update()` per row (so price history,
  attribute sync, and audit logging all still fire normally).
- **Atomic vs. non-atomic commit**: `atomic=true` refuses to write
  anything if *any* row would be skipped (all-or-nothing); the default
  (non-atomic) writes every valid row and reports the rest as skipped
  with per-row error messages — useful for "import what you can, fix the
  rest later" workflows.
- **Export**: filtered or full product list (or an explicit id list) to
  CSV/XLSX with human-readable reference columns (slugs/codes, not ids).

This is sized for admin-driven batches (hundreds to low thousands of
rows); there's no background job queue in this project yet, so very
large imports run synchronously within the request — see §16.

## 13. Audit logging

Every catalog mutation that matters for accountability writes a row via
`app/core/audit.py`'s `record_audit_log()`: `product_created`,
`product_updated` (with a `changes` diff for price/category/collection/
product_type), `product_cloned`, every `bulk_*` action, and
`price_rollback`. Reused, not reimplemented, from the same helper every
other domain (orders, RBAC, settings) already uses.

## 14. API surface

See [API.md](API.md) for the full endpoint table. In short: ten new
entities got the standard generic CRUD shape; `Product` itself is a
fully custom router because archive/restore/clone, seven bulk-mutation
endpoints, price rollback, scheduled price activation, and import/export
don't fit five CRUD verbs.

## 15. Admin panel

`ProductsPage.tsx` carries the full field set (pricing, inventory, SEO,
translations, product type/collection selects), row-level Archive/
Restore/Clone actions, a checkbox-selection-driven bulk-action menu
(status/manufacturer/category/collection/price-adjust/delete), and an
Import/Export toolbar (drag-and-drop file upload, mode selection,
preview-before-commit, atomic checkbox). The ten new reference/structure
entities (product types, attribute sets/items/groups, reference values,
collections, labels, label assignments, documents, videos) each get a
plain generic `CrudPage` — no bespoke UI needed since their API shape is
plain CRUD. `ReferenceValuesPage` offers the ten known `reference_type`
values as a dropdown instead of free text.

`CrudPage` gained two small, generic (not Product-specific) extension
points to support this: `extraRowActions` (render extra buttons per row,
before Edit/Delete) and `rowSelectionEnabled`/`selectedRowKeys`/
`onSelectionChange` (parent-controlled checkbox selection) — both usable
by any future entity that needs row-level actions or bulk operations.

## 16. Explicitly deferred / known gaps

These were identified during design and are intentionally out of scope
for this phase rather than overlooked:

- **Bot storefront integration**: the Telegram bot doesn't browse the
  catalog yet (no product search/category navigation/cart UI wired to
  `GET /products`). This phase is API-and-admin-panel-only.
- **`scripts/seed_catalog.py`**: seeds the real product types from the
  spec's worked examples (Kitchen Faucet, Bathroom Faucet, Sink, Mirror,
  Bathroom Cabinet, Shower System, Accessory, Toilet, Outdoor Faucet,
  Glass) with sensible attribute sets, so a fresh environment has more
  than the migration's one bootstrap "General" type. Run it with
  `docker compose exec backend python -m scripts.seed_catalog`.
- **Per-locale full-text search**: `search_vector` only indexes the
  base-locale columns, not translation overrides.
- **Attribute-based faceting**: `AttributeDefinition.is_filterable`
  exists but `get_filters()` doesn't yet aggregate over `ProductAttribute`
  values for custom-attribute facets (material, color, etc.).
- **File storage**: image/document/video URLs are plain strings; S3
  (or another object store) and real thumbnail generation are
  architecture-compatible (swap what populates `url`) but not implemented.
- **Import/export at very large scale**: synchronous, in-request
  processing; a background job queue for very large files doesn't exist
  yet in this project.
- **Scheduled price activation** relies on `POST /products/apply-scheduled-prices`
  being triggered (manually or by an external scheduler) rather than an
  in-process cron, since none exists yet.
- **Import "rollback" means atomicity, not undo.** `atomic=true` guarantees
  a commit either writes every valid row or none at all — but once a
  non-atomic (or atomic-and-successful) import has committed, there is no
  one-click "undo this import" that reverts the rows it touched. Per-row
  price changes made by an import are still visible in that product's own
  price history and can be rolled back individually via
  `POST /products/{id}/price-rollback`, but there's no batch/import-level
  equivalent.
