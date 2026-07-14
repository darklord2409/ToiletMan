import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog.category import Category
from app.models.catalog.collection import Collection
from app.models.catalog.product import Product
from app.models.commerce.order import Order
from app.models.commerce.order_item import OrderItem
from app.models.enums import AnalyticsEventType, OrderStatus, ProductStatus
from app.models.users.customer import Customer
from app.repositories.catalog.product_analytics_event import ProductAnalyticsEventRepository
from app.repositories.users.favorite import FavoriteRepository
from app.schemas.system.dashboard import (
    AnalyticsSummary,
    CategoryAnalyticsRow,
    CollectionAnalyticsRow,
    DashboardSalesSeries,
    DashboardSummary,
    ProductAnalyticsRow,
    SalesPoint,
    TopProduct,
)

# Cancelled/refunded orders never contributed real revenue (or gave it
# back) — excluded from every revenue/top-products aggregate below.
_EXCLUDED_REVENUE_STATUSES = (OrderStatus.CANCELLED, OrderStatus.REFUNDED)


class DashboardService:
    """Read-only aggregation for the admin panel's Dashboard page. Not a
    BaseService subclass — this has no CRUD entity of its own, only SQL
    aggregates over Product/Order/OrderItem/Customer."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.analytics_event_repo = ProductAnalyticsEventRepository(session)
        self.favorite_repo = FavoriteRepository(session)

    async def get_summary(self) -> DashboardSummary:
        session = self.session
        thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
        revenue_conditions = (
            Order.deleted_at.is_(None),
            ~Order.status.in_(_EXCLUDED_REVENUE_STATUSES),
        )

        revenue_total = (
            await session.execute(
                select(func.coalesce(func.sum(Order.grand_total), 0)).where(*revenue_conditions)
            )
        ).scalar_one()
        revenue_last_30_days = (
            await session.execute(
                select(func.coalesce(func.sum(Order.grand_total), 0)).where(
                    *revenue_conditions, Order.created_at >= thirty_days_ago
                )
            )
        ).scalar_one()

        orders_total = (
            await session.execute(
                select(func.count()).select_from(Order).where(Order.deleted_at.is_(None))
            )
        ).scalar_one()
        status_rows = (
            await session.execute(
                select(Order.status, func.count())
                .where(Order.deleted_at.is_(None))
                .group_by(Order.status)
            )
        ).all()
        orders_by_status = {row[0].value: row[1] for row in status_rows}

        products_total = (
            await session.execute(
                select(func.count()).select_from(Product).where(Product.deleted_at.is_(None))
            )
        ).scalar_one()
        products_active = (
            await session.execute(
                select(func.count())
                .select_from(Product)
                .where(Product.deleted_at.is_(None), Product.status == ProductStatus.ACTIVE)
            )
        ).scalar_one()

        customers_total = (
            await session.execute(
                select(func.count()).select_from(Customer).where(Customer.deleted_at.is_(None))
            )
        ).scalar_one()

        # Mirrors ProductRead.availability_status (app/schemas/catalog/product.py)
        # in SQL — computing it in Python would mean pulling every row.
        available_expr = Product.stock_quantity - Product.reserved_quantity
        out_of_stock_count = (
            await session.execute(
                select(func.count())
                .select_from(Product)
                .where(
                    Product.deleted_at.is_(None),
                    Product.is_unlimited_stock.is_(False),
                    available_expr <= 0,
                )
            )
        ).scalar_one()
        low_stock_count = (
            await session.execute(
                select(func.count())
                .select_from(Product)
                .where(
                    Product.deleted_at.is_(None),
                    Product.is_unlimited_stock.is_(False),
                    available_expr > 0,
                    Product.low_stock_threshold.is_not(None),
                    available_expr <= Product.low_stock_threshold,
                )
            )
        ).scalar_one()

        top_rows = (
            await session.execute(
                select(
                    OrderItem.product_id,
                    OrderItem.product_name,
                    OrderItem.sku,
                    func.sum(OrderItem.quantity).label("qty"),
                    func.sum(OrderItem.line_total).label("rev"),
                )
                .join(Order, Order.id == OrderItem.order_id)
                .where(
                    Order.deleted_at.is_(None),
                    ~Order.status.in_(_EXCLUDED_REVENUE_STATUSES),
                    Order.created_at >= thirty_days_ago,
                )
                .group_by(OrderItem.product_id, OrderItem.product_name, OrderItem.sku)
                .order_by(func.sum(OrderItem.quantity).desc())
                .limit(5)
            )
        ).all()
        top_products = [
            TopProduct(
                product_id=row.product_id,
                name=row.product_name,
                sku=row.sku,
                quantity_sold=int(row.qty),
                revenue=row.rev,
            )
            for row in top_rows
        ]

        return DashboardSummary(
            revenue_total=revenue_total,
            revenue_last_30_days=revenue_last_30_days,
            orders_total=orders_total,
            orders_by_status=orders_by_status,
            products_total=products_total,
            products_active=products_active,
            customers_total=customers_total,
            low_stock_count=low_stock_count,
            out_of_stock_count=out_of_stock_count,
            top_products=top_products,
        )

    async def get_sales_series(self, days: int = 30) -> DashboardSalesSeries:
        start = datetime.now(UTC) - timedelta(days=days)
        rows = (
            await self.session.execute(
                select(
                    func.date_trunc("day", Order.created_at).label("day"),
                    func.coalesce(func.sum(Order.grand_total), 0).label("revenue"),
                    func.count().label("order_count"),
                )
                .where(
                    Order.deleted_at.is_(None),
                    ~Order.status.in_(_EXCLUDED_REVENUE_STATUSES),
                    Order.created_at >= start,
                )
                .group_by("day")
                .order_by("day")
            )
        ).all()
        points = [
            SalesPoint(date=row.day.date(), revenue=row.revenue, order_count=row.order_count)
            for row in rows
        ]
        return DashboardSalesSeries(points=points)

    async def _product_rows(
        self, pairs: list[tuple[uuid.UUID, int]]
    ) -> list[ProductAnalyticsRow]:
        if not pairs:
            return []
        ids = [product_id for product_id, _ in pairs]
        rows = (
            await self.session.execute(
                select(Product.id, Product.name, Product.sku).where(Product.id.in_(ids))
            )
        ).all()
        by_id = {row.id: row for row in rows}
        return [
            ProductAnalyticsRow(
                product_id=product_id,
                name=by_id[product_id].name,
                sku=by_id[product_id].sku,
                count=count,
            )
            for product_id, count in pairs
            if product_id in by_id
        ]

    async def get_analytics_summary(self) -> AnalyticsSummary:
        """Backs the admin dashboard's "most viewed/favorited/added to
        cart/requested products" and "popular collections/categories"
        widgets — see ProductAnalyticsEvent (views/add-to-cart, logged in
        the storefront catalog/cart services) plus the existing
        Favorite/OrderItem tables for the other two."""
        most_viewed = await self._product_rows(
            await self.analytics_event_repo.most_common_products(AnalyticsEventType.VIEW)
        )
        most_favorited = await self._product_rows(
            await self.favorite_repo.most_favorited_products()
        )
        most_added_to_cart = await self._product_rows(
            await self.analytics_event_repo.most_common_products(AnalyticsEventType.ADD_TO_CART)
        )

        requested_rows = (
            await self.session.execute(
                select(
                    OrderItem.product_id,
                    OrderItem.product_name,
                    OrderItem.sku,
                    func.sum(OrderItem.quantity).label("qty"),
                )
                .join(Order, Order.id == OrderItem.order_id)
                .where(Order.deleted_at.is_(None), ~Order.status.in_(_EXCLUDED_REVENUE_STATUSES))
                .group_by(OrderItem.product_id, OrderItem.product_name, OrderItem.sku)
                .order_by(func.sum(OrderItem.quantity).desc())
                .limit(10)
            )
        ).all()
        most_requested = [
            ProductAnalyticsRow(
                product_id=row.product_id, name=row.product_name, sku=row.sku, count=int(row.qty)
            )
            for row in requested_rows
            if row.product_id is not None
        ]

        collection_pairs = await self.analytics_event_repo.most_common_collections(
            AnalyticsEventType.VIEW
        )
        collection_ids = [collection_id for collection_id, _ in collection_pairs]
        collection_names = (
            {
                row.id: row.name
                for row in (
                    await self.session.execute(
                        select(Collection.id, Collection.name).where(
                            Collection.id.in_(collection_ids)
                        )
                    )
                ).all()
            }
            if collection_ids
            else {}
        )
        popular_collections = [
            CollectionAnalyticsRow(collection_id=cid, name=collection_names[cid], count=count)
            for cid, count in collection_pairs
            if cid in collection_names
        ]

        category_pairs = await self.analytics_event_repo.most_common_categories(
            AnalyticsEventType.VIEW
        )
        category_ids = [category_id for category_id, _ in category_pairs]
        category_names = (
            {
                row.id: row.name
                for row in (
                    await self.session.execute(
                        select(Category.id, Category.name).where(Category.id.in_(category_ids))
                    )
                ).all()
            }
            if category_ids
            else {}
        )
        popular_categories = [
            CategoryAnalyticsRow(category_id=cid, name=category_names[cid], count=count)
            for cid, count in category_pairs
            if cid in category_names
        ]

        return AnalyticsSummary(
            most_viewed_products=most_viewed,
            most_favorited_products=most_favorited,
            most_added_to_cart_products=most_added_to_cart,
            most_requested_products=most_requested,
            popular_collections=popular_collections,
            popular_categories=popular_categories,
        )
