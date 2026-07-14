from sqlalchemy import Select
from sqlalchemy.orm import selectinload

from app.models.catalog.reference_value import ReferenceValue
from app.repositories.base import BaseRepository


class ReferenceValueRepository(BaseRepository[ReferenceValue]):
    model = ReferenceValue

    def _base_query(self) -> Select[tuple[ReferenceValue]]:
        # `translations` is eager-loaded because ReferenceValueRead serializes
        # it on every response; without this, Pydantic's post-request access
        # to a lazy relationship would attempt a sync load outside the async
        # greenlet context and raise MissingGreenlet.
        return super()._base_query().options(selectinload(ReferenceValue.translations))
