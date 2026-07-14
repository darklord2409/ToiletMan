import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class TopProduct(BaseModel):
    product_id: uuid.UUID | None
    name: str
    sku: str
    quantity_sold: int
    revenue: Decimal


class DashboardSummary(BaseModel):
    revenue_total: Decimal
    revenue_last_30_days: Decimal
    orders_total: int
    orders_by_status: dict[str, int]
    products_total: int
    products_active: int
    customers_total: int
    low_stock_count: int
    out_of_stock_count: int
    top_products: list[TopProduct]


class SalesPoint(BaseModel):
    date: date
    revenue: Decimal
    order_count: int


class DashboardSalesSeries(BaseModel):
    points: list[SalesPoint]


class ProductAnalyticsRow(BaseModel):
    product_id: uuid.UUID
    name: str
    sku: str
    count: int


class CategoryAnalyticsRow(BaseModel):
    category_id: uuid.UUID
    name: str
    count: int


class CollectionAnalyticsRow(BaseModel):
    collection_id: uuid.UUID
    name: str
    count: int


class AnalyticsSummary(BaseModel):
    """Backs the admin dashboard's analytics widgets — see
    services/system/dashboard.py::DashboardService.get_analytics_summary
    and ANALYTICS in TELEGRAM.md."""

    most_viewed_products: list[ProductAnalyticsRow]
    most_favorited_products: list[ProductAnalyticsRow]
    most_added_to_cart_products: list[ProductAnalyticsRow]
    most_requested_products: list[ProductAnalyticsRow]
    popular_collections: list[CollectionAnalyticsRow]
    popular_categories: list[CategoryAnalyticsRow]
