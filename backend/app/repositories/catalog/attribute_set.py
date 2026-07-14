from app.models.catalog.attribute_set import AttributeSet
from app.repositories.base import BaseRepository


class AttributeSetRepository(BaseRepository[AttributeSet]):
    model = AttributeSet
