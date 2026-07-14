import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_attribute import ProductAttributeRepository
from app.schemas.catalog.product_attribute import (
    ProductAttributeCreate,
    ProductAttributeRead,
    ProductAttributeUpdate,
)
from app.services.catalog.product_attribute import ProductAttributeService

get_product_attribute_service = make_service_dependency(
    ProductAttributeService, ProductAttributeRepository
)


def product_attribute_filters(
    product_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.product_id")),
) -> dict[str, Any]:
    return {"product_id": product_id}


router = build_crud_router(
    service_dependency=get_product_attribute_service,
    read_schema=ProductAttributeRead,
    create_schema=ProductAttributeCreate,
    update_schema=ProductAttributeUpdate,
    filter_dependency=product_attribute_filters,
    prefix="/product-attributes",
    tags=["product-attributes"],
)
