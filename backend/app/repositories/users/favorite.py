import uuid

from sqlalchemy import func, select

from app.models.users.favorite import Favorite
from app.repositories.base import BaseRepository


class FavoriteRepository(BaseRepository[Favorite]):
    model = Favorite

    async def get_by_customer_and_product(
        self, customer_id: uuid.UUID, product_id: uuid.UUID
    ) -> Favorite | None:
        result = await self.session.execute(
            self._base_query().where(
                Favorite.customer_id == customer_id, Favorite.product_id == product_id
            )
        )
        return result.scalar_one_or_none()

    async def most_favorited_products(self, *, limit: int = 10) -> list[tuple[uuid.UUID, int]]:
        """Returns [(product_id, favorite_count), ...] ordered by count
        desc — backs the "most favorited products" dashboard widget."""
        query = (
            select(Favorite.product_id, func.count().label("favorite_count"))
            .where(Favorite.deleted_at.is_(None))
            .group_by(Favorite.product_id)
            .order_by(func.count().desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return [(row.product_id, row.favorite_count) for row in result.all()]
