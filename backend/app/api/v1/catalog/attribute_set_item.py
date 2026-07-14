import uuid
from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.attribute_set_item import AttributeSetItemRepository
from app.schemas.catalog.attribute_set_item import (
    AttributeSetItemCreate,
    AttributeSetItemRead,
    AttributeSetItemUpdate,
)
from app.services.catalog.attribute_set_item import AttributeSetItemService

get_attribute_set_item_service = make_service_dependency(
    AttributeSetItemService, AttributeSetItemRepository
)


def attribute_set_item_filters(
    attribute_set_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.attribute_set_id")
    ),
    attribute_definition_id: uuid.UUID | None = Query(
        None, description=translate("swagger.filters.attribute_definition_id")
    ),
) -> dict[str, Any]:
    return {
        "attribute_set_id": attribute_set_id,
        "attribute_definition_id": attribute_definition_id,
    }


router = build_crud_router(
    service_dependency=get_attribute_set_item_service,
    read_schema=AttributeSetItemRead,
    create_schema=AttributeSetItemCreate,
    update_schema=AttributeSetItemUpdate,
    filter_dependency=attribute_set_item_filters,
    prefix="/attribute-set-items",
    tags=["attribute-set-items"],
)
