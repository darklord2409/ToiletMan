import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_document import ProductDocumentRepository
from app.schemas.catalog.product_document import (
    ProductDocumentCreate,
    ProductDocumentRead,
    ProductDocumentUpdate,
)
from app.services.catalog.product_document import ProductDocumentService

get_product_document_service = make_service_dependency(
    ProductDocumentService, ProductDocumentRepository
)


def product_document_filters(
    product_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.product_id")),
) -> dict[str, Any]:
    return {"product_id": product_id}


router = build_crud_router(
    service_dependency=get_product_document_service,
    read_schema=ProductDocumentRead,
    create_schema=ProductDocumentCreate,
    update_schema=ProductDocumentUpdate,
    filter_dependency=product_document_filters,
    prefix="/product-documents",
    tags=["product-documents"],
)
