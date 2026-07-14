import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.commerce.order_item import OrderItemRepository
from app.schemas.commerce.order_item import OrderItemCreate, OrderItemRead
from app.services.commerce.order_item import OrderItemService

get_order_item_service = make_service_dependency(OrderItemService, OrderItemRepository)


def order_item_filters(
    order_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.order_id")),
) -> dict[str, Any]:
    return {"order_id": order_id}


router = build_crud_router(
    service_dependency=get_order_item_service,
    read_schema=OrderItemRead,
    create_schema=OrderItemCreate,
    filter_dependency=order_item_filters,
    prefix="/order-items",
    tags=["order-items"],
)
