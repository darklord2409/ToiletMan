from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.attribute_set import AttributeSetRepository
from app.schemas.catalog.attribute_set import (
    AttributeSetCreate,
    AttributeSetRead,
    AttributeSetUpdate,
)
from app.services.catalog.attribute_set import AttributeSetService

get_attribute_set_service = make_service_dependency(AttributeSetService, AttributeSetRepository)

router = build_crud_router(
    service_dependency=get_attribute_set_service,
    read_schema=AttributeSetRead,
    create_schema=AttributeSetCreate,
    update_schema=AttributeSetUpdate,
    prefix="/attribute-sets",
    tags=["attribute-sets"],
)
