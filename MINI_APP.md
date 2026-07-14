# Mini App

TipoBot's customer-facing storefront — a Telegram Mini App, not a plain
mobile website: native Telegram chrome (back button, haptics, theme
sync), an offline-friendly shopping flow (browse → cart → checkout →
manager-fulfilled order), and the same quality bar as the admin panel
(real e2e tests against a live backend, not mocks).

See also: [ADMIN_PANEL.md](ADMIN_PANEL.md) for the operator-facing panel
this storefront's catalog is managed through, and [CATALOG.md](CATALOG.md)
for the Product Catalog Engine both clients read from.

## Stack

React 18 + TypeScript + Vite 6 + **Ant Design Mobile 5** (not desktop
antd — a separate component library built for touch/mobile), TanStack
Query for all server state, react-router 7, i18next (ru/en/uz),
`@telegram-apps/sdk-react` for the Telegram Mini Apps SDK, Playwright for
e2e.

## Backend extensions

The backend was admin-only when this Mini App was scoped — customer
tokens couldn't reach the catalog, there was no cart/favorites logic, and
checkout fields didn't exist. All of the following were added *for* this
Mini App (see `backend/app/api/v1/storefront/`,
`backend/app/services/storefront/`):

- **Storefront router** (`api/v1/storefront/`) — mounted outside
  `protected_router` (admin-only) in `api/v1/router.py`. Catalog browsing
  (`/storefront/products`, `/categories/tree`, `/banners`, `/collections`,
  `/manufacturers`, `/product-types`, `/product-labels`) is genuinely
  public; cart/favorites/checkout each gate themselves individually via
  `get_current_customer` (a customer JWT, distinguished from admin JWTs by
  an `actor` claim).
- **Cart** — real server-side cart with price-snapshotting (the unit price
  is captured at add-time, not re-read live) and stock validation on add.
- **Favorites** — new `Favorite` model (customer_id + product_id, unique
  constraint), idempotent add/remove.
- **Checkout** — `Order` gained `delivery_method`, `payment_method`,
  `contact_name`, `contact_phone` columns. No online payment: cash is the
  only `PaymentMethod`, delivery is `pickup` or `delivery` (address
  required for the latter, enforced by a `model_validator`), and
  submitting creates a `pending` order for a manager to process manually.
- **Product list thumbnails** — `ProductRead` (the admin schema) carries
  no image reference; a `ProductListItem` schema
  (`schemas/storefront/catalog.py`) adds `primary_image_url`, resolved via
  a batched `ProductImageRepository.get_primary_image_map()` query (one
  query per page of results, not one per product) so catalog grids and
  "related products" rows always have a thumbnail.
- **Active banners** — `GET /storefront/banners` (`Banner` already existed
  for the admin panel; this adds the public, date-window-filtered read
  path for the Mini App's home carousel).
- **Recommendations** — the product detail response's `recommendations`
  field groups five kinds of related products (`frequently_bought_together`,
  `accessories`, `related` — all admin-curated — plus computed
  `same_collection` and `similar`, deduplicated against the curated groups)
  instead of one flat list. See [TELEGRAM.md](TELEGRAM.md#recommendations).
- **Order `manager_notes`** — a manager-only note field on `Order`,
  visible read-only on this app's order detail page once a manager adds
  one; setting it (or changing `status`) triggers a Telegram notification
  to the customer — see [TELEGRAM.md](TELEGRAM.md#notifications).

All of it is covered by `backend/tests/test_storefront.py` (17 tests) —
including a customer-auth roundtrip through the real Telegram `initData`
HMAC verification (see [Testing](#testing-playwright) below), not a
bypass.

## Telegram integration

`src/telegram/sdk.ts` boots `@telegram-apps/sdk-react` once at startup
(`bootTelegramSdk()`): mounts BackButton, MainButton, ThemeParams,
Viewport, and restores `initData` — every mount is individually
try/caught, so an unsupported component (or *not running inside Telegram
at all*, e.g. a plain browser tab or Playwright) degrades silently
instead of crashing the app. `src/telegram/hooks.ts` wraps this into
`useTelegramBackButton`, `useTelegramMainButton`, `useHaptics`, and
`useTelegramIsDark`.

Two things worth knowing before touching this layer:

- **Native chrome never gates functionality.** The Telegram BackButton and
  MainButton aren't part of the page DOM — a headless/Playwright browser
  can't see or click them at all. Every screen therefore has its own
  in-page back arrow (`PageHeader`) and action button (e.g. the Checkout
  page's footer submit button); the native versions are a synced
  enhancement layered on top (`useTelegramMainButton` is currently wired
  up on the Checkout page), not the only way to do anything.
- **Auth doesn't require being inside Telegram at boot** —
  `AuthContext.tsx` checks localStorage for a stored customer token
  first, and only falls back to the Telegram `initData` handshake
  (`POST /customer-auth/telegram`) if none exists. If neither succeeds,
  `TelegramGuard` shows an "open this in Telegram" screen rather than a
  broken app shell. This is what makes e2e testing possible without a real
  Telegram client (see below) and is also just the correct behavior for
  someone opening the Mini App's URL directly in a browser.

**Cloud Storage**: `src/lib/storage.ts`'s `kvStorage` treats localStorage
as the synchronous source of truth (read on first paint, so theme/language
never flash a default before an async Cloud read resolves) and mirrors
writes to Telegram CloudStorage best-effort, reconciling from the cloud
value once at boot if it differs — used for theme mode, language, and
search history.

## Architecture

- **Auth** (`src/auth/AuthContext.tsx`) — three states: `initializing`
  (SDK boot + token restore in flight), `guest` (no valid session —
  renders `TelegramGuard`), `authenticated` (renders the routed app).
- **Theme** (`src/theme/ThemeContext.tsx`) — `light` / `dark` / `auto`
  (auto follows Telegram's `themeParams.isDark`, falling back to the
  system `prefers-color-scheme` outside Telegram). Applies via
  `document.documentElement.dataset.prefersColorScheme`, matching
  antd-mobile's own dark-mode convention
  (`html[data-prefers-color-scheme='dark']`, defined in its bundled CSS —
  no algorithm swap needed, unlike desktop antd). Also owns antd-mobile's
  own `ConfigProvider` locale (`ru-RU`/`en-US` — antd-mobile ships no
  Uzbek locale of its own, so `uz` falls back to `en-US`) so built-in
  component chrome (Stepper's +/− accessible labels, PullToRefresh's
  default text, etc.) is never left in antd-mobile's Chinese default.
- **Routing** (`src/App.tsx`, `src/layout/AppLayout.tsx`) — five tab-root
  routes (`/`, `/catalog`, `/favorites`, `/cart`, `/profile`, tracked in
  `layout/tabs.ts`) render inside `AppLayout` with the bottom `TabBar`;
  everything else (product detail, search, checkout, order detail,
  settings, contacts, store info) is a pushed screen — no tab bar, native
  + in-page back navigation instead.
- **API layer** (`src/api/*.ts`) — one file per backend domain
  (catalog/cart/favorites/checkout/customerAuth/settings), thin typed
  wrappers around a shared axios instance (`src/api/client.ts`) with the
  same access/refresh-token interceptor pattern as the admin panel.
  `src/hooks/*.ts` layers TanStack Query on top per domain.
- **Types** (`src/types/entities.ts`) — mirrors the backend Pydantic
  schemas field-for-field. Important: Pydantic v2 serializes `Decimal` as
  a JSON **string** (to preserve exact precision), so every money/decimal
  field here is typed `string`, not `number` — see `src/lib/format.ts`
  (`formatMoney`, `hasDiscount`, `discountPercent`) for the only place
  that should ever parse them.

## Features

- **Home** — store name/logo (public settings), search entry point,
  active banner carousel, quick category chips, featured products
  (`is_featured=true`), on-sale products (client-side filtered from a
  recent page for `compare_at_price > price` — there's no dedicated
  "on sale" server-side filter), new arrivals (sorted by `created_at`),
  and a collections row. Pull-to-refresh invalidates every query.
- **Catalog** — category-scoped (`/catalog/:categoryId`, pushed from a
  quick-category tap) or the full grid (`/catalog` tab), sort (newest/
  price/name/featured via an `ActionSheet`), filters (manufacturer +
  price range, from `/storefront/products/filters`, in a `Popup`), and
  infinite scroll (`InfiniteScroll` + `useInfiniteQuery`).
- **Product detail** — image gallery (`Swiper`, tap to open
  `ImageViewer.Multi` for pinch-zoom), specifications/documents/videos in
  tabs, price + old price + labels + stock status, quantity stepper,
  add-to-cart, favorite toggle, share (native `navigator.share` where
  available, clipboard fallback), and up to five recommendation rows
  (frequently bought together, accessories, related, same collection,
  similar — each rendered only if non-empty; see
  [TELEGRAM.md](TELEGRAM.md#recommendations)).
- **Search** (`/search`, pushed from Home or Catalog) — instant results as
  you type (debounced 300ms), recent-search history (persisted via
  `kvStorage`), and "popular searches" seeded from category names (no
  search-analytics feature exists to source real popularity data from).
- **Favorites / Cart** — straightforward list/grid views over the
  favorites and cart hooks; Cart supports per-item quantity edit, swipe-to-
  remove (`SwipeAction`), and a clear-cart confirm dialog.
- **Checkout** — contact name/phone, delivery method (pickup / delivery +
  address, address conditionally required), optional comment, cash-only
  payment (display-only, non-editable), an order summary, and a submit
  that's mirrored to the native Telegram MainButton. Success lands on the
  new order's detail page with a confirmation banner.
- **Profile** — customer name/phone header, My Orders (paginated, status
  tags) with an order detail page showing items/total/delivery/contact,
  the customer's own checkout comment, and (once set) the manager's note,
  Contacts (edit first/last name + phone), Settings (language, theme,
  notification preference), About the store (public settings: address,
  phone, working hours, delivery info, social links).

## Internationalization

`ru` (default) / `en` / `uz`, one JSON namespace per feature area under
`src/i18n/locales/{ru,en,uz}/` (`common`, `home`, `catalog`, `product`,
`cart`, `checkout`, `profile`, `favorites`) — same pattern as the admin
panel. Language changes call `PATCH /customer-auth/me/language` once
authenticated (always true here — see [Auth](#architecture)) and persist
client-side via `kvStorage`.

## Development

```bash
cd miniapp
npm install
npm run dev           # Vite dev server, proxies /api and /media to backend:8000
npm run build          # tsc --noEmit && vite build
npm run lint           # eslint . (flat config, eslint.config.js)
npm run test:e2e       # Playwright — see below
```

Or via the repo's `docker-compose.yml` (`miniapp` service, port 5174) —
mirrors the `admin` service's container pattern exactly (bind mount +
named `node_modules` volume, `allowedHosts` includes `miniapp` for other
containers on the compose network).

The Telegram bot's "🛍 Open Shop" button (`bot/app/keyboards/webapp.py`)
only appears once `WEBAPP_URL` is set in `.env` to a public HTTPS URL —
Telegram rejects non-HTTPS `web_app` buttons outright, so this is blank
by default for local dev (no button shown, no crash).

### Testing (Playwright)

The backend has no test-only auth bypass (nor should it) — Telegram
`initData` is real HMAC-SHA256-signed data, verified against `BOT_TOKEN`
(`backend/app/core/telegram.py::verify_init_data`). Rather than mock
that away, `e2e/telegramAuth.ts` **signs a real `initData` payload** with
the same algorithm and the actual `BOT_TOKEN`, so `e2e/global.setup.ts`
exercises the genuine `/customer-auth/telegram` handshake — a fresh
random `telegram_id` each run, so every e2e run starts as a brand-new
customer with an empty cart/favorites/order history. The resulting tokens
are seeded into `localStorage` and saved as Playwright `storageState`
(`e2e/.auth/customer.json`), so every other spec starts pre-authenticated.

Covers: tab navigation + the unauthenticated guard screen, catalog
browsing/sort/product-detail, add-to-cart → cart → checkout (both the
pickup happy path and the delivery-requires-address validation path),
favorites toggle, instant search + no-results, and the theme/language
switches in Settings.

Playwright's bundled Chromium/`chrome-headless-shell` need glibc and won't
launch on the `node:22-alpine` base the `miniapp` dev container uses.
Either run from the official glibc-based `mcr.microsoft.com/playwright`
image against the already-running `miniapp` dev server, joined to the
same compose network:

```bash
docker run --rm \
  --network tipobot_tipobot_network \
  -v "//d/tipoBot/miniapp:/work" \
  -v "miniapp_playwright_node_modules:/work/node_modules" \
  -w /work \
  --env-file "D:\tipoBot\.env" \
  -e PLAYWRIGHT_BASE_URL=http://miniapp:5174 \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  npx playwright test
```

...or install a system Chromium directly in the existing `miniapp`
container (`apk add --no-cache chromium`) and point Playwright at it via
`PLAYWRIGHT_CHROMIUM_PATH` (read by `playwright.config.ts`, which also
strips two fields — `screen` and `defaultBrowserType` — off the `iPhone 13`
device preset only in that mode; both independently crash this musl
container's software Vulkan/ANGLE on launch, for reasons unrelated to
this app's own code):

```bash
docker compose exec -T miniapp apk add --no-cache chromium
docker compose exec -T -e BOT_TOKEN -e PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium-browser \
  miniapp npx playwright test
```

(`--env-file`/`-e BOT_TOKEN` supplies the token for the initData-signing
step above — always source it from the existing `.env`, never pass it as
a literal value or write it to a new file. On Windows/git-bash, prefix
`MSYS_NO_PATHCONV=1` or it mangles `/usr/bin/...`-style values and
double-slash host paths into a Windows path; not needed on a native
Linux/macOS shell.)

## Known gaps / follow-ons

- **"Popular products"/"popular searches"** still don't feed Home/Search
  from real usage data — Home's "popular" row reuses `is_featured`, and
  Search's suggestion chips reuse category names. Product view/add-to-cart
  events and favorite/order aggregates *are* now tracked
  (`GET /dashboard/analytics`, see [TELEGRAM.md](TELEGRAM.md#analytics)),
  but that endpoint currently only feeds the admin dashboard — wiring a
  Mini App "most viewed"/"trending" row to it is a real follow-on, not
  blocked on any missing backend capability anymore.
- **"On sale" is client-filtered.** There's no server-side `has_discount`
  filter on `/storefront/products`, so Home's sale row scans a recent page
  of results for `compare_at_price > price` client-side. Fine at current
  catalog sizes; a dedicated filter would scale better.
- **MainButton syncing** is only wired up on Checkout. Other primary
  actions (Add to Cart, Place Order retry) rely solely on their in-page
  button — a deliberate scope call (every action already has a fully
  functional in-DOM control; native-button syncing is a polish layer, not
  load-bearing), not an oversight.
- Product videos render via a plain `<iframe>`/`<video>` — no lazy-loading
  or lite-embed optimization for the YouTube case.
