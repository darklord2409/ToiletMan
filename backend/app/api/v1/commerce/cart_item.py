import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.commerce.cart_item import CartItemRepository
from app.schemas.commerce.cart_item import CartItemCreate, CartItemRead, CartItemUpdate
from app.services.commerce.cart_item import CartItemService

get_cart_item_service = make_service_dependency(CartItemService, CartItemRepository)


def cart_item_filters(
    cart_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.cart_id")),
) -> dict[str, Any]:
    return {"cart_id": cart_id}


router = build_crud_router(
    service_dependency=get_cart_item_service,
    read_schema=CartItemRead,
    create_schema=CartItemCreate,
    update_schema=CartItemUpdate,
    filter_dependency=cart_item_filters,
    prefix="/cart-items",
    tags=["cart-items"],
)
