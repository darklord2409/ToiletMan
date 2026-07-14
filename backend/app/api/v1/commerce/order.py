import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.models.enums import OrderStatus
from app.repositories.commerce.order import OrderRepository
from app.schemas.commerce.order import OrderCreate, OrderRead, OrderUpdate
from app.services.commerce.order import OrderService

get_order_service = make_service_dependency(OrderService, OrderRepository)


def order_filters(
    customer_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.customer_id")
    ),
    status: OrderStatus | None = Query(
        None, description=translate("swagger.filters.order_status")
    ),
) -> dict[str, Any]:
    return {"customer_id": customer_id, "status": status}


router = build_crud_router(
    service_dependency=get_order_service,
    read_schema=OrderRead,
    create_schema=OrderCreate,
    update_schema=OrderUpdate,
    filter_dependency=order_filters,
    prefix="/orders",
    tags=["orders"],
)
