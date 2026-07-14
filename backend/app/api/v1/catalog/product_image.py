import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_image import ProductImageRepository
from app.schemas.catalog.product_image import (
    ProductImageCreate,
    ProductImageRead,
    ProductImageUpdate,
)
from app.services.catalog.product_image import ProductImageService

get_product_image_service = make_service_dependency(ProductImageService, ProductImageRepository)


def product_image_filters(
    product_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.product_id")),
) -> dict[str, Any]:
    return {"product_id": product_id}


router = build_crud_router(
    service_dependency=get_product_image_service,
    read_schema=ProductImageRead,
    create_schema=ProductImageCreate,
    update_schema=ProductImageUpdate,
    filter_dependency=product_image_filters,
    prefix="/product-images",
    tags=["product-images"],
)
