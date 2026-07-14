from sqlalchemy import Select
from sqlalchemy.orm import selectinload

from app.models.catalog.product_label import ProductLabel
from app.repositories.base import BaseRepository


class ProductLabelRepository(BaseRepository[ProductLabel]):
    model = ProductLabel

    def _base_query(self) -> Select[tuple[ProductLabel]]:
        # `translations` is eager-loaded because ProductLabelRead serializes
        # it on every response; without this, Pydantic's post-request access
        # to a lazy relationship would attempt a sync load outside the async
        # greenlet context and raise MissingGreenlet.
        return super()._base_query().options(selectinload(ProductLabel.translations))
