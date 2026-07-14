from typing import Any

from fastapi import Query

from app.api.v1.crud_router import build_crud_router
from app.core.i18n import translate
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.reference_value import ReferenceValueRepository
from app.schemas.catalog.reference_value import (
    ReferenceValueCreate,
    ReferenceValueRead,
    ReferenceValueUpdate,
)
from app.services.catalog.reference_value import ReferenceValueService

get_reference_value_service = make_service_dependency(
    ReferenceValueService, ReferenceValueRepository
)


def reference_value_filters(
    reference_type: str | None = Query(
        None, description=translate("swagger.filters.reference_type")
    ),
) -> dict[str, Any]:
    return {"reference_type": reference_type}


router = build_crud_router(
    service_dependency=get_reference_value_service,
    read_schema=ReferenceValueRead,
    create_schema=ReferenceValueCreate,
    update_schema=ReferenceValueUpdate,
    filter_dependency=reference_value_filters,
    prefix="/reference-values",
    tags=["reference-values"],
)
