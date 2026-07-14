from sqlalchemy import Select
from sqlalchemy.orm import selectinload

from app.models.catalog.attribute_group import AttributeGroup
from app.repositories.base import BaseRepository


class AttributeGroupRepository(BaseRepository[AttributeGroup]):
    model = AttributeGroup

    def _base_query(self) -> Select[tuple[AttributeGroup]]:
        # `translations` is eager-loaded because AttributeGroupRead serializes
        # it on every response; without this, Pydantic's post-request access
        # to a lazy relationship would attempt a sync load outside the async
        # greenlet context and raise MissingGreenlet.
        return super()._base_query().options(selectinload(AttributeGroup.translations))
