from sqlalchemy import Select
from sqlalchemy.orm import selectinload

from app.models.catalog.attribute_definition import AttributeDefinition
from app.repositories.base import BaseRepository


class AttributeDefinitionRepository(BaseRepository[AttributeDefinition]):
    model = AttributeDefinition

    def _base_query(self) -> Select[tuple[AttributeDefinition]]:
        # `translations` is eager-loaded because AttributeDefinitionRead
        # serializes it on every response; without this, Pydantic's
        # post-request access to a lazy relationship would attempt a sync
        # load outside the async greenlet context and raise MissingGreenlet.
        return super()._base_query().options(selectinload(AttributeDefinition.translations))
