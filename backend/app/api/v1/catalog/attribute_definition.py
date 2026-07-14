from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.attribute_definition import AttributeDefinitionRepository
from app.schemas.catalog.attribute_definition import (
    AttributeDefinitionCreate,
    AttributeDefinitionRead,
    AttributeDefinitionUpdate,
)
from app.services.catalog.attribute_definition import AttributeDefinitionService

get_attribute_definition_service = make_service_dependency(
    AttributeDefinitionService, AttributeDefinitionRepository
)

router = build_crud_router(
    service_dependency=get_attribute_definition_service,
    read_schema=AttributeDefinitionRead,
    create_schema=AttributeDefinitionCreate,
    update_schema=AttributeDefinitionUpdate,
    prefix="/attribute-definitions",
    tags=["attribute-definitions"],
)
