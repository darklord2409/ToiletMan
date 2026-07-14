# Admin Panel

An enterprise-grade admin panel for TipoBot's backend platform and Product
Catalog Engine — not a plain CRUD scaffold: config-driven entity screens,
a bespoke Product editor, drag-and-drop image/attribute management, saved
filters and table layouts, keyboard shortcuts, context menus, optimistic
updates, and a full Playwright e2e suite.

See also: [ARCHITECTURE.md](ARCHITECTURE.md) for how `admin/` fits into the
overall system, and [CATALOG.md](CATALOG.md) for the Product Catalog Engine
this panel is a client of.

## Stack

React 18 + TypeScript + Vite 6 + Ant Design 5, TanStack Query for all
server state, react-hook-form for the generic entity form, react-router 7,
i18next (ru/en/uz), `@dnd-kit` for drag-and-drop, `react-easy-crop` for
image cropping, recharts for the dashboard chart, Playwright for e2e.

## Layout

`AppLayout.tsx` provides the shell every authenticated route renders inside:

- **Collapsible sidebar** — grouped nav (Catalog / Commerce / Users /
  Content / System), collapses automatically below the `lg` breakpoint.
- **Header** — sidebar toggle, global search, language switcher, dark/light
  theme switch, notification bell, user menu (logout).
- **Tabs bar** (`TabsBar.tsx` / `OpenTabsContext.tsx`) — IDE-style: every
  page you visit opens a closeable tab, persisted per browser tab via
  `sessionStorage` so a reload doesn't lose your open set.
- **Breadcrumbs** (`BreadcrumbBar.tsx` / `BreadcrumbContext.tsx`) — derived
  from the route tree; pages can push an "extra" segment (e.g. a product's
  SKU) via `useBreadcrumbExtra`.
- **Global search** (`GlobalSearch.tsx`, `Ctrl/Cmd+K`) — fuzzy-matches nav
  pages by label, plus live API lookups against products/orders/customers
  once you've typed 2+ characters.

Responsive down to mobile (antd's grid breakpoints throughout); dark mode
is a single `ConfigProvider` algorithm swap (`ThemeContext.tsx`), applied
consistently since every page uses antd tokens rather than hardcoded colors.

## Dashboard

`DashboardPage.tsx`: revenue (30-day), orders (+ status breakdown),
products (+ active count), customers, low-stock / out-of-stock counts
(click through to a pre-filtered product list), a sales area chart with
7/30/90-day range toggle, popular products, latest products, lowest-stock
products, and a recent-activity feed sourced from the audit log.

## Catalog

- **Products** (`ProductsPage.tsx` + `ProductEditorPage.tsx`): bulk
  multi-select actions (status/manufacturer/category/collection/price
  adjust/delete), clone, archive/restore, an Excel/CSV import wizard
  (upload → mode select → preview with per-row errors → commit, with an
  atomic-rollback option), and export to CSV or Excel — either the current
  filtered list or just the selected rows. The editor has 12 tabs: General,
  Translations (EN/UZ — the un-suffixed base fields on the General tab
  *are* the Russian content, since `ru` is the store's default locale;
  there's deliberately no third "RU" translation block), Images,
  Specifications, Pricing, Inventory, Collections, Labels, SEO, Documents,
  Videos, History.
- **Images** (`productEditor/ImagesTab.tsx`): drag-and-drop upload, grid
  gallery, crop (`react-easy-crop`), replace, set-primary, drag-to-reorder
  (`@dnd-kit`), delete.
- **Attribute Sets** (`AttributeSetEditorPage.tsx`): a real visual editor —
  dual-pane assign/remove, drag-to-reorder, per-attribute required/visible
  toggles and default value, with a search-filtered picker of remaining
  attribute definitions.
- **Collections** (`CollectionDetailPage.tsx`): search + checkbox product
  assignment against the bulk-collection-change endpoint.
- **Price management**: bulk percentage/fixed adjustment from the Products
  list; `PriceHistoryPage.tsx` (System → Price History) lists every price
  change with a one-click rollback to any prior entry.

Every other catalog entity (categories, manufacturers, units, product
types, attribute definitions/groups, reference values, labels + label
assignments, documents, videos) is a plain generic `CrudPage` — no bespoke
UI needed since their API shape is plain CRUD (see
[CATALOG.md §15](CATALOG.md#15-admin-panel)).

- **Product Recommendations** (`ProductRecommendationsPage.tsx`,
  Catalog → Product Recommendations): a generic `CrudPage` over
  `/product-recommendations` — curate `frequently_bought_together`,
  `accessory`, and `related` links between two products. This is only the
  admin-curated half; the storefront combines it with two computed
  groups (same collection, similar) — see
  [TELEGRAM.md](TELEGRAM.md#recommendations).

## Users

Admin Users, Roles, Permissions, Role-Permissions are generic `CrudPage`
screens. **Sessions**: each Admin User row has a "Sessions" action opening
a modal listing that user's active refresh-token sessions (device, IP,
started-at) with per-session and revoke-all actions, backed by
`GET/DELETE /admin-users/{id}/sessions`.

## Settings

Three distinct screens, intentionally not merged:

- **Store Settings** (`StoreSettingsPage.tsx`, `/content/store-settings`) —
  a structured form over the `/settings` singleton: store name/logo/
  address, contacts (phone, support email/phone, Telegram/WhatsApp/
  Instagram), currency, default language, tax rate/inclusion, delivery
  terms, and a per-weekday working-hours editor.
- **Bot Settings** (`BotSettingsPage.tsx`, `/content/bot-settings`) — the
  same `/settings` singleton, a different field subset: bot name/username,
  per-locale welcome text + welcome image (upload, not a pasted URL — see
  [ImageUploadField](#cross-cutting-ux-crudpagetsx) below) and menu-button
  label, an optional per-locale pinned announcement, manager Telegram IDs
  (who gets notified on a new order), and per-locale, per-event
  notification-template overrides (falling back to built-in defaults when
  blank). See [TELEGRAM.md](TELEGRAM.md#bot-settings).
- **Site Settings** (`SiteSettingsPage.tsx`, `/content/site-settings`) — a
  raw key/value store (`/site-settings`) for ad-hoc storefront/bot config
  that doesn't warrant a dedicated column on `StoreSettings`.

## System

- **Analytics** (`AnalyticsPage.tsx`, `/system/analytics`) — six widgets
  fed by `GET /dashboard/analytics`: most viewed/favorited/added-to-cart/
  requested products, and popular collections/categories. See
  [TELEGRAM.md](TELEGRAM.md#analytics) for what's tracked and how.
- **Media Library** (`UploadedFilesPage.tsx`, `/system/uploaded-files`) —
  a thumbnail gallery (not a plain metadata table) over `/uploaded-files`:
  drag-free multi-file upload button, per-file copy-URL and delete, paginated
  grid, search by file name. Reused wherever an image needs picking — see
  `ImageUploadField` below.
- **Price History** (`PriceHistoryPage.tsx`, `/system/price-history`) —
  every price change with a one-click rollback to any prior entry (also
  reachable from the Products list's bulk price-adjust action).
- **Audit Logs** (`AuditLogsPage.tsx`, `/system/audit-logs`) — every
  mutating admin action, filterable by entity type/action/actor.

## Cross-cutting UX (`CrudPage.tsx`)

Every generic entity screen shares one component, so these apply
everywhere at once:

- **Saved filters** — name and save the current search/sort/page-size as a
  preset (localStorage, per resource, per browser); apply or delete later
  from the "Saved filters" toolbar button.
- **Saved table layouts** — a "Columns" button (gear icon) to show/hide and
  drag-reorder columns, persisted automatically per resource.
- **Context menus** — right-click any row for Copy ID / Edit / Delete.
- **Keyboard shortcuts** — `Ctrl/Cmd+K` global search, `N` new record,
  `/` focus the page's search box, `?` shortcuts cheat-sheet, and
  Linear/GitHub-style `G` then a letter to jump to a section (`G D`
  dashboard, `G P` products, `G O` orders, `G C` customers, `G U` admin
  users, `G S` store settings, `G A` audit logs) — all inactive while
  typing in a field. Implemented in `useKeyboardShortcut.ts` (per-page) and
  `layout/GlobalShortcuts.tsx` (app-wide).
- **Optimistic updates** — `useCrudResource.ts`'s update/delete mutations
  patch every matching cached list page immediately (`onMutate`), rolling
  back on error; create stays invalidate-on-success since a fabricated row
  can't know its real sort/page position ahead of the server response.
- **Loading skeletons** — used on data-heavy pages (e.g. the product
  editor) instead of a bare spinner.
- **Image fields** (`ImageUploadField.tsx`) — a reusable upload-and-preview
  control (thumbnail + Upload/Remove buttons, backed by
  `POST /uploaded-files/upload`) available as `type: "image"` in any
  `CrudPage`'s `FormFieldConfig[]` (used by Banners, News, Collections,
  Manufacturers) and dropped directly into bespoke forms like Store/Bot
  Settings' logo/welcome-image fields — one control instead of a bare
  paste-a-URL `Input` everywhere an image is needed.

## Internationalization

`ru` (default) / `en` / `uz`, one JSON namespace per feature area under
`src/i18n/locales/{ru,en,uz}/`. The language switcher persists the choice
both client-side (`localStorage`) and server-side
(`PATCH /auth/me/language`) once authenticated.

## Development

```bash
cd admin
npm install
npm run dev          # Vite dev server, proxies /api and /media to backend:8000
npm run build         # tsc --noEmit && vite build
npm run lint          # eslint . (flat config, eslint.config.js)
npm run test:e2e      # Playwright — see below
```

Or via the repo's `docker-compose.yml` (`admin` service, port 5173) — the
dev container's `allowedHosts` includes `admin` alongside `localhost` so
other containers on the compose network (e.g. the Playwright runner) can
reach it by service name.

### Tests (Playwright)

`admin/e2e/`: `global.setup.ts` logs in once via the real UI and saves a
`storageState` (auth is rate-limited to 5 logins/min — every other spec
starts pre-authenticated instead of burning that budget) — except
`auth.spec.ts`, which explicitly opts out of storage state to exercise the
login/invalid-credentials flow itself. Covers: auth, dashboard widgets +
dark mode, products list/search/create/editor tabs, store settings
save round-trip, admin sessions modal, the shortcuts/context-menu/
saved-layout/language-switch UX layer, and (`telegram-admin.spec.ts`) Bot
Settings' save round-trip plus Product Recommendations/Analytics/Media
Library loading. Needs a running backend + seeded admin account:

```bash
docker compose exec backend python -m scripts.create_superuser <user> <email> <password>
PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test
```

(Update the credentials in `e2e/fixtures.ts` to match.)

Playwright's bundled Chromium needs glibc and won't launch on the
`node:22-alpine` base this dev container uses. Fix: install a system
Chromium in the container and point Playwright at it —

```bash
docker compose exec -T admin apk add --no-cache chromium
docker compose exec -T -e PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium-browser \
  admin npx playwright test
```

(`playwright.config.ts` reads `PLAYWRIGHT_CHROMIUM_PATH` and sets
`launchOptions.executablePath` + `args: ["--no-sandbox", "--disable-gpu"]`
only when it's set, so this is opt-in and doesn't affect environments
where the bundled browser works. On Windows/git-bash, prefix
`MSYS_NO_PATHCONV=1` or it mangles the `/usr/bin/...` value into a Windows
path.)

## Known gaps / follow-ons

- The production bundle is route-code-split (`React.lazy` per page in
  `App.tsx`), but the shared vendor chunk (React, antd, react-query, etc.)
  is still a single ~1.8MB file; further `manualChunks` splitting would
  improve cache reuse across deploys but wasn't needed to clear Vite's
  size warning meaningfully.
- Pressing Escape to close a modal that was opened via a keyboard shortcut
  (rather than a mouse click) can occasionally not register on the very
  first press in some browser/focus states — antd's own Escape-to-close
  behavior, not something this panel implements; closing via the visible
  close button or an outside click always works.
- Import/Export wizards exist for Products only; the ten reference/
  structure entities that got a plain `CrudPage` have no bulk import path
  (their datasets are small and edited directly).
