# Telegram Integration

How the Telegram **bot**, the **Mini App** storefront, and the **backend**
fit together. The one rule that shapes everything below:

> **The bot is not the storefront.** The bot is only the entry point, the
> notification channel, and customer communication (support/promotions/
> settings). It never renders categories, products, or a shopping cart —
> that's all the [Mini App](MINI_APP.md)'s job. See
> [ARCHITECTURE.md](ARCHITECTURE.md) for where this fits in the wider
> system and [ADMIN_PANEL.md](ADMIN_PANEL.md) for how everything below is
> configured without touching code.

```
Telegram → Telegram Bot → Telegram Mini App → Backend API → PostgreSQL
                ↓                                   ↑
                └──────── notifications ────────────┘
```

The bot and the Mini App are both just **clients of the same backend** —
neither talks to the other directly, and the bot holds no product/order
data of its own (Redis is a token cache, nothing more).

## Bot entry point

`/start` (`bot/app/handlers/start.py`) sends a welcome message — admin-
configured per-locale text and an optional photo (falls back to a plain
built-in greeting if unset) — with the persistent main-menu keyboard, sets
the chat's menu button, and pins an announcement if one is configured.
Every value comes from `GET /settings` (public subset); nothing is
hardcoded.

The main menu (`bot/app/keyboards/main_menu.py`) is a `ReplyKeyboardMarkup`
with seven buttons. Four are `KeyboardButton(web_app=WebAppInfo(url=...))`
— a single tap deep-links straight into a specific Mini App route, no
bot-rendered list of anything in between:

| Button | Mini App route |
|---|---|
| 🛍 Open Store | `/` |
| 📦 My Requests | `/profile/orders` |
| ❤️ Favorites | `/favorites` |
| 🎁 Promotions | `/` (home carousel) |

The other three (☎ Support, ⚙ Settings, ℹ About Store) are plain-text
buttons — reply keyboards carry no callback data, so
`bot/app/handlers/menu.py` matches them by exact localized text
(`label_variants()`, locale-aware) and answers with a plain message built
from `GET /settings`'s public fields (support phone/Telegram/WhatsApp/
email, working hours, address, delivery info) — "not configured" text if
a field is blank, never a broken/empty reply.

The whole keyboard is `None` (no menu at all) when `WEBAPP_URL` isn't set
— Telegram rejects a non-HTTPS `web_app` button outright, so local dev
without a public tunnel shows a bot with no shop button rather than one
that crashes on tap.

## Authentication

The bot has no login screens and asks the customer for nothing. On first
use of any backend-touching feature (Settings, notifications), it
**signs its own Telegram `initData` payload** for the current update's
user (`bot/app/core/telegram_auth.py::build_signed_init_data`) — the same
HMAC-SHA256 algorithm the backend already verifies
(`backend/app/core/telegram.py::verify_init_data`) — and POSTs it to the
*existing* `POST /customer-auth/telegram` endpoint. Zero new backend auth
endpoints; the bot just becomes another caller of the Mini App's own login
flow. The resulting JWT is cached in Redis per `telegram_id`
(`bot/app/services/customer_session.py`), TTL set just under the token's
own expiry so a request never lands right as the cache lapses.

The Mini App's own auth (`initData` handshake at boot, no separate
password) is unchanged — see [MINI_APP.md](MINI_APP.md#architecture).

## Requests ("My Requests")

Deliberately not reimplemented in the bot: "📦 My Requests" deep-links to
the Mini App's own order-list/detail pages
(`miniapp/src/pages/OrderDetailPage.tsx`), which already show request
number, status, date, products, total, delivery method, the customer's
own checkout comment, and (once set) the manager's note. The bot's role
is limited to *telling the customer something changed* — see
Notifications below.

## Notifications

The bot has no background job/queue infrastructure to poll, so
notifications are pushed **directly from the backend**: when something
notification-worthy happens inside a normal request/response cycle, the
backend calls Telegram's Bot API over plain HTTP
(`backend/app/services/telegram_notifier.py::TelegramNotifier.send_message`,
a thin `httpx` POST to `https://api.telegram.org/bot{token}/sendMessage`).
A failed send is logged and swallowed — it never fails the underlying
request (an order status change must succeed even if Telegram is down).

`NotificationService` (`backend/app/services/notifications.py`) owns
rendering + sending for three triggers:

| Trigger | Recipient | Fires from |
|---|---|---|
| `Order.status` changes to one of confirmed/processing/shipped/delivered/cancelled/refunded | the customer | `OrderService.update()` |
| `Order.manager_notes` is set/changed | the customer | `OrderService.update()` |
| A new order is placed | every configured manager | `StorefrontCheckoutService` after order creation |

`OrderService.update()` (`backend/app/services/commerce/order.py`) is the
one deliberate carve-out from otherwise-generic CRUD: it diffs `status`
and `manager_notes` before/after the base update and fires the
appropriate notification only on an actual change — so a `PATCH` that
doesn't touch either field sends nothing.

Message text is locale-aware and admin-editable, with a working default
before any admin ever configures anything:

```
resolve_template(event_key, locale, overrides)
  admin override (event locale) → admin override (default locale)
  → built-in default (event locale) → built-in default (default locale)
  → the raw event key (last resort)
```

`resolve_template` is a pure function with no DB access — `overrides`
comes from `StoreSettings.notification_templates` (see Bot Settings
below), and `DEFAULT_TEMPLATES` in the same file has ru/en/uz copy for
every event out of the box.

Future events (price changed, back in stock, promotion started) can be
added by extending `DEFAULT_TEMPLATES` + wiring a new call site — the
rendering/override/delivery machinery is already generic.

## Manager notifications

`StoreSettings.manager_telegram_ids` (a JSON list of Telegram user IDs,
edited in Bot Settings — see below) controls who gets pinged on a new
order. `StorefrontCheckoutService` calls
`NotificationService.notify_managers_new_order(order, customer,
product_lines)` right after the order + items are created and the cart is
cleared, sending the same rendered alert (customer name/phone, product
lines, total, delivery method, comment) to every ID in the list — zero
configured managers means zero messages sent, not an error.

## Support / Promotions / Settings

- **Support** — entirely `GET /settings`-driven (see Bot entry point
  above); no support contact info is hardcoded in the bot.
- **Promotions** — deep-links to the Mini App home, which already renders
  the active banner carousel (`GET /storefront/banners`,
  date-window-filtered) — no separate promotions feature in the bot.
- **Settings** — a `⚙ Settings` inline keyboard toggles
  `Customer.notifications_enabled` (`bot/app/keyboards/settings.py` +
  `handlers/menu.py::on_toggle_notifications`) and offers a language
  picker (`handlers/language.py`) that updates *both* the bot's own Redis-
  cached locale and the backend's `Customer.language` column (so
  `NotificationService` — which reads `customer.language`, not the bot's
  Redis value — renders in the right language even if the customer never
  opens the Mini App again). The Mini App's own Settings page
  (`/profile/settings`) controls the identical backend fields
  independently — either surface works, they're the same source of truth.

## Bot Settings (admin)

A new admin page (`admin/src/pages/content/BotSettingsPage.tsx`,
`/content/bot-settings`) over the *same* `StoreSettings` singleton
`GET/PATCH /settings` already used by Store Settings, just a different
field subset — no new table, no new endpoint:

- `bot_name`, `bot_username`
- `welcome_text` (per-locale JSON), `welcome_image_url` (upload, not a
  pasted URL — see [ADMIN_PANEL.md](ADMIN_PANEL.md#cross-cutting-ux-crudpagetsx))
- `menu_button_text` (per-locale, 16-char Telegram limit enforced client-side)
- `pinned_announcement` (per-locale, optional)
- `manager_telegram_ids` (add/remove list)
- `notification_templates` (per-event, per-locale overrides — blank falls
  back to the built-in default, see Notifications above)

`manager_telegram_ids` and `notification_templates` are deliberately
*excluded* from `PublicStoreSettings` (the schema `GET /storefront/*`-style
public reads expose) — they're operational config, not something a
storefront visitor's request should ever see.

## Recommendations

`ProductDetailResponse.recommendations` (`GET /storefront/products/{id}`)
groups five kinds of related products instead of one flat list:

| Group | Source |
|---|---|
| `frequently_bought_together` | admin-curated |
| `accessories` | admin-curated |
| `related` | admin-curated |
| `same_collection` | computed: other active products in the same collection |
| `similar` | computed: active products sharing category + manufacturer, topped up with category + product-type matches if that's fewer than 8 |

Curated links live in a new `ProductRecommendation` table (`product_id`,
`recommended_product_id`, `relation_type` enum, `sort_order`), managed via
a plain generic CRUD page
([ADMIN_PANEL.md](ADMIN_PANEL.md#catalog)) — `GET/POST/PATCH/DELETE
/product-recommendations`. The two computed groups need no admin input at
all and are deduplicated against every curated id so the same product
never appears twice across groups. The Mini App renders each group as its
own row, skipping empty ones
([MINI_APP.md](MINI_APP.md#features)).

## Analytics

`GET /dashboard/analytics` (permission `reports.read`) backs six admin
dashboard widgets:

| Widget | Source |
|---|---|
| Most viewed products | new `ProductAnalyticsEvent` table, `event_type=VIEW`, logged on every `GET /storefront/products/{id}` |
| Most added to cart | same table, `event_type=ADD_TO_CART`, logged on `POST /storefront/cart/items` |
| Most favorited products | the existing `Favorite` table, aggregated directly |
| Most requested products | the existing `OrderItem`/`Order` join, aggregated directly (mirrors the dashboard's existing "top products" query, no time window) |
| Popular collections | `ProductAnalyticsEvent` (views) joined through `Product.collection_id` |
| Popular categories | `ProductAnalyticsEvent` (views) joined through `Product.category_id` |

Only two of the six needed new storage (`ProductAnalyticsEvent` — an
append-only table mirroring the existing `AuditLog` pattern: product,
event type, optional customer id); the rest are computed from tables that
already existed for other reasons. View events are logged anonymously (the
storefront product-detail endpoint has no auth requirement); add-to-cart
events carry the customer id when the request is authenticated.

The admin panel's Analytics page
(`admin/src/pages/system/AnalyticsPage.tsx`, `/system/analytics`) renders
all six as simple tables. None of this currently feeds the Mini App's own
"popular" rows — see [MINI_APP.md](MINI_APP.md#known-gaps--follow-ons).

## Media Library

Product images, manufacturer logos, collection banners, store banners,
and the bot's welcome image all go through the same pre-existing
`UploadedFile` model + `POST /uploaded-files/upload` endpoint (polymorphic
`entity_type`/`entity_id`, statically served under `/media`) — no backend
changes were needed here, only an admin-side upgrade:

- **Media Library page** (`/system/uploaded-files`) is now a thumbnail
  gallery (upload button, per-file copy-URL/delete, search, pagination)
  instead of a plain metadata table.
- **`ImageUploadField`** — a reusable upload-and-preview control, wired in
  as `type: "image"` in the generic `CrudPage` form-field config and
  dropped directly into Store/Bot Settings' logo/welcome-image fields —
  one control instead of a bare paste-a-URL text input everywhere an
  image is needed. See
  [ADMIN_PANEL.md](ADMIN_PANEL.md#cross-cutting-ux-crudpagetsx).

Local filesystem storage (`backend/app/core/config.py`'s upload dir) is
unchanged; swapping in S3/R2/MinIO later is a storage-backend change
behind the same `UploadedFile`/upload-endpoint contract, not a schema or
API-shape change.

## Testing

- **Backend** (`backend/tests/test_notifications.py`, 9 tests): pure
  tests call `resolve_template()` directly with literal dicts (no DB
  touch at all); two real-integration tests go through the actual
  `PATCH /orders/{id}` endpoint with the real `TelegramNotifier`, hitting
  the real Telegram API with a synthetic `telegram_id` and asserting a
  graceful (non-raising) failure — same "real integration over mocks"
  philosophy as the rest of this backend's test suite. `test_dashboard.py`
  and `test_storefront.py` cover the analytics endpoint and the
  recommendation-grouping/dedup logic respectively.
- **Bot** (`bot/tests/`, 18 tests, built from scratch this phase — the bot
  had no test infrastructure before): includes a genuine end-to-end proof
  that the bot's own `build_signed_init_data` HMAC implementation is
  byte-compatible with the backend's `verify_init_data` by actually
  POSTing a bot-signed payload to a live backend and getting back a real
  token. Tests hit the real Telegram API with synthetic `telegram_id`s too
  (a clean "chat not found" is caught and logged, never raised).
- **Admin** (`admin/e2e/telegram-admin.spec.ts`): Bot Settings' save
  round-trip, and Product Recommendations/Analytics/Media Library pages
  loading.
- **Mini App**: the order-detail e2e assertion checks the customer's own
  checkout comment renders back on the order page (manager notes need an
  admin action to populate, so aren't exercised end-to-end); the settings
  e2e spec covers the notification-preference toggle round-trip.

## Known gaps / follow-ons

- **Price-changed / back-in-stock / promotion-started notifications** are
  not implemented — `DEFAULT_TEMPLATES` and the rendering/override/
  delivery machinery are generic enough to add them, but no trigger call
  site exists yet for any of the three.
- **Mini App theme setting** is Light/Dark/Auto already (not a future
  item) — the original ask's "Theme (future)" for bot-side settings is a
  non-issue since the bot has no theme concept of its own to toggle; only
  the Mini App renders UI.
- **Analytics doesn't feed the Mini App itself** yet (see Analytics
  above) — only the admin dashboard consumes `GET /dashboard/analytics`
  today.
- **Media Library storage is local-disk only** — S3/R2/MinIO was scoped
  as a future backend swap, not built this phase.
