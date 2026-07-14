import uuid
from datetime import datetime

from sqlalchemy import func, select

from app.models.catalog.product import Product
from app.models.catalog.product_analytics_event import ProductAnalyticsEvent
from app.models.enums import AnalyticsEventType
from app.repositories.base import BaseRepository


class ProductAnalyticsEventRepository(BaseRepository[ProductAnalyticsEvent]):
    model = ProductAnalyticsEvent

    async def log(
        self,
        *,
        product_id: uuid.UUID,
        event_type: AnalyticsEventType,
        customer_id: uuid.UUID | None = None,
    ) -> None:
        self.session.add(
            ProductAnalyticsEvent(
                product_id=product_id, event_type=event_type, customer_id=customer_id
            )
        )
        await self.session.flush()

    async def most_common_products(
        self,
        event_type: AnalyticsEventType,
        *,
        since: datetime | None = None,
        limit: int = 10,
    ) -> list[tuple[uuid.UUID, int]]:
        """Returns [(product_id, event_count), ...] ordered by count desc —
        backs the "most viewed"/"most added to cart" dashboard widgets."""
        query = (
            select(ProductAnalyticsEvent.product_id, func.count().label("event_count"))
            .where(
                ProductAnalyticsEvent.event_type == event_type,
                ProductAnalyticsEvent.deleted_at.is_(None),
            )
            .group_by(ProductAnalyticsEvent.product_id)
            .order_by(func.count().desc())
            .limit(limit)
        )
        if since is not None:
            query = query.where(ProductAnalyticsEvent.created_at >= since)
        result = await self.session.execute(query)
        return [(row.product_id, row.event_count) for row in result.all()]

    async def most_common_collections(
        self, event_type: AnalyticsEventType, *, limit: int = 10
    ) -> list[tuple[uuid.UUID, int]]:
        """Returns [(collection_id, event_count), ...] — events on products
        with no collection are excluded, not counted as one group."""
        query = (
            select(Product.collection_id, func.count().label("event_count"))
            .select_from(ProductAnalyticsEvent)
            .join(Product, Product.id == ProductAnalyticsEvent.product_id)
            .where(
                ProductAnalyticsEvent.event_type == event_type,
                ProductAnalyticsEvent.deleted_at.is_(None),
                Product.collection_id.is_not(None),
            )
            .group_by(Product.collection_id)
            .order_by(func.count().desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return [(row.collection_id, row.event_count) for row in result.all()]

    async def most_common_categories(
        self, event_type: AnalyticsEventType, *, limit: int = 10
    ) -> list[tuple[uuid.UUID, int]]:
        """Returns [(category_id, event_count), ...]."""
        query = (
            select(Product.category_id, func.count().label("event_count"))
            .select_from(ProductAnalyticsEvent)
            .join(Product, Product.id == ProductAnalyticsEvent.product_id)
            .where(
                ProductAnalyticsEvent.event_type == event_type,
                ProductAnalyticsEvent.deleted_at.is_(None),
            )
            .group_by(Product.category_id)
            .order_by(func.count().desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return [(row.category_id, row.event_count) for row in result.all()]
