from app.api.v1.crud_router import build_crud_router
from app.dependencies.factory import make_service_dependency
from app.repositories.catalog.attribute_group import AttributeGroupRepository
from app.schemas.catalog.attribute_group import (
    AttributeGroupCreate,
    AttributeGroupRead,
    AttributeGroupUpdate,
)
from app.services.catalog.attribute_group import AttributeGroupService

get_attribute_group_service = make_service_dependency(
    AttributeGroupService, AttributeGroupRepository
)

router = build_crud_router(
    service_dependency=get_attribute_group_service,
    read_schema=AttributeGroupRead,
    create_schema=AttributeGroupCreate,
    update_schema=AttributeGroupUpdate,
    prefix="/attribute-groups",
    tags=["attribute-groups"],
)
