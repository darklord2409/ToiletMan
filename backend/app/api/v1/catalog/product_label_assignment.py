import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.product_label_assignment import ProductLabelAssignmentRepository
from app.schemas.catalog.product_label_assignment import (
    ProductLabelAssignmentCreate,
    ProductLabelAssignmentRead,
)
from app.services.catalog.product_label_assignment import ProductLabelAssignmentService

get_product_label_assignment_service = make_service_dependency(
    ProductLabelAssignmentService, ProductLabelAssignmentRepository
)


def product_label_assignment_filters(
    product_id: uuid.UUID | None = Query(None, description=translate("swagger.filters.product_id")),
) -> dict[str, Any]:
    return {"product_id": product_id}


router = build_crud_router(
    service_dependency=get_product_label_assignment_service,
    read_schema=ProductLabelAssignmentRead,
    create_schema=ProductLabelAssignmentCreate,
    filter_dependency=product_label_assignment_filters,
    prefix="/product-label-assignments",
    tags=["product-label-assignments"],
)
