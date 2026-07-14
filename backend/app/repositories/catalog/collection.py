from sqlalchemy import Select
from sqlalchemy.orm import selectinload

from app.models.catalog.collection import Collection
from app.repositories.base import BaseRepository


class CollectionRepository(BaseRepository[Collection]):
    model = Collection

    def _base_query(self) -> Select[tuple[Collection]]:
        # `translations` is eager-loaded because CollectionRead serializes it
        # on every response; without this, Pydantic's post-request access to
        # a lazy relationship would attempt a sync load outside the async
        # greenlet context and raise MissingGreenlet.
        return super()._base_query().options(selectinload(Collection.translations))
