from sqlalchemy import Select
from sqlalchemy.orm import selectinload

from app.models.catalog.product_type import ProductType
from app.repositories.base import BaseRepository


class ProductTypeRepository(BaseRepository[ProductType]):
    model = ProductType

    def _base_query(self) -> Select[tuple[ProductType]]:
        # `translations` is eager-loaded because ProductTypeRead serializes it
        # on every response; without this, Pydantic's post-request access to
        # a lazy relationship would attempt a sync load outside the async
        # greenlet context and raise MissingGreenlet.
        return super()._base_query().options(selectinload(ProductType.translations))
