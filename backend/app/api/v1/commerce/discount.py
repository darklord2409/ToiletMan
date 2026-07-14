import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.commerce.discount import DiscountRepository
from app.schemas.commerce.discount import DiscountCreate, DiscountRead, DiscountUpdate
from app.services.commerce.discount import DiscountService

get_discount_service = make_service_dependency(DiscountService, DiscountRepository)


def discount_filters(
    promotion_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.promotion_id")
    ),
) -> dict[str, Any]:
    return {"promotion_id": promotion_id}


router = build_crud_router(
    service_dependency=get_discount_service,
    read_schema=DiscountRead,
    create_schema=DiscountCreate,
    update_schema=DiscountUpdate,
    filter_dependency=discount_filters,
    prefix="/discounts",
    tags=["discounts"],
)
