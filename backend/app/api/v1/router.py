from fastapi import APIRouter, Depends

from app.api.v1 import health, i18n
from app.api.v1.auth.router import router as auth_router
from app.api.v1.catalog.router import router as catalog_router
from app.api.v1.commerce.router import router as commerce_router
from app.api.v1.content.router import router as content_router
from app.api.v1.customer_auth.router import router as customer_auth_router
from app.api.v1.settings.router import router as settings_router
from app.api.v1.storefront.router import router as storefront_router
from app.api.v1.system.router import router as system_router
from app.api.v1.users.router import router as users_router
from app.dependencies.auth import get_current_admin_user

api_router = APIRouter()

# Public / self-authenticating routers — no blanket dependency, each
# protects its own routes individually (or is intentionally public, like
# health checks, i18n catalogs, and /settings/public).
api_router.include_router(health.router)
api_router.include_router(i18n.router)
api_router.include_router(auth_router)
api_router.include_router(customer_auth_router)
api_router.include_router(settings_router)
# Mini App storefront: catalog browsing is public, cart/favorites/checkout
# each gate themselves on a *customer* token (see storefront/router.py) —
# deliberately outside protected_router, which only accepts admin tokens.
api_router.include_router(storefront_router)

# Admin-only routers: gated behind admin authentication at the router
# level (defense in depth) and per-action RBAC permission checks inside
# each entity's CRUD router (see api/v1/crud_router.py).
protected_router = APIRouter(dependencies=[Depends(get_current_admin_user)])
protected_router.include_router(catalog_router)
protected_router.include_router(users_router)
protected_router.include_router(commerce_router)
protected_router.include_router(content_router)
protected_router.include_router(system_router)
api_router.include_router(protected_router)
