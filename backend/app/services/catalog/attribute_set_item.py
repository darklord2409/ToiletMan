from app.models.catalog.attribute_set_item import AttributeSetItem
from app.schemas.catalog.attribute_set_item import AttributeSetItemCreate, AttributeSetItemUpdate
from app.services.base import BaseService


class AttributeSetItemService(
    BaseService[AttributeSetItem, AttributeSetItemCreate, AttributeSetItemUpdate]
):
    entity_name = "Attribute set item"
    resource = "attribute-set-items"
