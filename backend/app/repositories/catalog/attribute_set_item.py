from app.models.catalog.attribute_set_item import AttributeSetItem
from app.repositories.base import BaseRepository


class AttributeSetItemRepository(BaseRepository[AttributeSetItem]):
    model = AttributeSetItem
