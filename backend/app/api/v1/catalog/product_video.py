import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_video import ProductVideoRepository
from app.schemas.catalog.product_video import (
    ProductVideoCreate,
    ProductVideoRead,
    ProductVideoUpdate,
)
from app.services.catalog.product_video import ProductVideoService

get_product_video_service = make_service_dependency(ProductVideoService, ProductVideoRepository)


def product_video_filters(
    product_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.product_id")),
) -> dict[str, Any]:
    return {"product_id": product_id}


router = build_crud_router(
    service_dependency=get_product_video_service,
    read_schema=ProductVideoRead,
    create_schema=ProductVideoCreate,
    update_schema=ProductVideoUpdate,
    filter_dependency=product_video_filters,
    prefix="/product-videos",
    tags=["product-videos"],
)
