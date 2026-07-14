from app.models.catalog.attribute_set import AttributeSet
from app.schemas.catalog.attribute_set import AttributeSetCreate, AttributeSetUpdate
from app.services.base import BaseService


class AttributeSetService(BaseService[AttributeSet, AttributeSetCreate, AttributeSetUpdate]):
    entity_name = "Attribute set"
    resource = "attribute-sets"
    search_fields = ["code", "name"]
