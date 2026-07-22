from fastapi import APIRouter

from app.api.v1.storefront.cart import router as cart_router
from app.api.v1.storefront.catalog import router as catalog_router
from app.api.v1.storefront.checkout import router as checkout_router
from app.api.v1.storefront.favorites import router as favorites_router
from app.api.v1.storefront.pages import router as pages_router

# Everything here is reachable with a *customer* token (or, for the plain
# catalog browsing routes, no token at all) — never an admin token, and
# never behind the admin-only `protected_router` in api/v1/router.py.
# Catalog routes are genuinely public (a storefront must be browsable
# before/without Telegram auth completing); cart/favorites/checkout each
# depend on `get_current_customer` individually.
router = APIRouter()
router.include_router(catalog_router)
router.include_router(pages_router)
router.include_router(cart_router)
router.include_router(favorites_router)
router.include_router(checkout_router)
