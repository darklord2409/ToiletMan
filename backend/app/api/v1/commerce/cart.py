import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.commerce.cart import CartRepository
from app.schemas.commerce.cart import CartCreate, CartRead, CartUpdate
from app.services.commerce.cart import CartService

get_cart_service = make_service_dependency(CartService, CartRepository)


def cart_filters(
    customer_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.customer_id")
    ),
) -> dict[str, Any]:
    return {"customer_id": customer_id}


router = build_crud_router(
    service_dependency=get_cart_service,
    read_schema=CartRead,
    create_schema=CartCreate,
    update_schema=CartUpdate,
    filter_dependency=cart_filters,
    prefix="/carts",
    tags=["carts"],
)
