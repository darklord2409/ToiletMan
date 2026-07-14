from fastapi import APIRouter

from app.api.v1.commerce import cart, cart_item, coupon, discount, order, order_item, promotion

router = APIRouter()
for module in (cart, cart_item, order, order_item, promotion, discount, coupon):
    router.include_router(module.router)
