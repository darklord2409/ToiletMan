import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.system.price_history import PriceHistoryRepository
from app.schemas.system.price_history import PriceHistoryCreate, PriceHistoryRead
from app.services.system.price_history import PriceHistoryService

get_price_history_service = make_service_dependency(PriceHistoryService, PriceHistoryRepository)


def price_history_filters(
    product_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.product_id")),
) -> dict[str, Any]:
    return {"product_id": product_id}


router = build_crud_router(
    service_dependency=get_price_history_service,
    read_schema=PriceHistoryRead,
    create_schema=PriceHistoryCreate,
    allow_delete=False,
    filter_dependency=price_history_filters,
    prefix="/price-history",
    tags=["price-history"],
)
