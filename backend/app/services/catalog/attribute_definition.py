from app.models.catalog.attribute_definition import AttributeDefinition
from app.schemas.catalog.attribute_definition import (
    AttributeDefinitionCreate,
    AttributeDefinitionUpdate,
)
from app.services.base import BaseService


class AttributeDefinitionService(
    BaseService[AttributeDefinition, AttributeDefinitionCreate, AttributeDefinitionUpdate]
):
    entity_name = "Attribute definition"
    resource = "attribute-definitions"
    search_fields = ["code", "name"]
