import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog.category import Category
from app.models.catalog.product import Product
from app.models.catalog.product_type import ProductType
from app.models.catalog.unit import Unit
from app.models.enums import ProductStatus


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _login(client: AsyncClient, credentials: tuple[str, str]) -> str:
    username, password = credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def test_dashboard_summary_requires_reports_permission(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    """`limited_admin_credentials` (conftest.py) is granted only
    products.read — reports.read is a separate, unrelated permission."""
    token = await _login(client, limited_admin_credentials)
    response = await client.get("/api/v1/dashboard/summary", headers=_auth(token))
    assert response.status_code == 403


async def test_dashboard_summary_shape(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    response = await client.get("/api/v1/dashboard/summary", headers=_auth(token))
    assert response.status_code == 200, response.text
    body = response.json()
    for key in (
        "revenue_total",
        "revenue_last_30_days",
        "orders_total",
        "orders_by_status",
        "products_total",
        "products_active",
        "customers_total",
        "low_stock_count",
        "out_of_stock_count",
        "top_products",
    ):
        assert key in body
    assert body["products_total"] >= 1
    assert isinstance(body["top_products"], list)


async def test_sales_series_returns_points_for_requested_window(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    response = await client.get(
        "/api/v1/dashboard/sales-series", headers=_auth(token), params={"days": 7}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "points" in body
    assert isinstance(body["points"], list)
    for point in body["points"]:
        assert {"date", "revenue", "order_count"} <= point.keys()


@pytest_asyncio.fixture
async def analytics_product(
    db_session: AsyncSession,
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> AsyncGenerator[Product]:
    """An explicitly ACTIVE product — the storefront detail endpoint (used
    to generate VIEW events below) only ever shows active products."""
    suffix = uuid.uuid4().hex[:8]
    product = Product(
        category_id=test_category.id,
        unit_id=test_unit.id,
        product_type_id=test_product_type.id,
        sku=f"ANALYTICS-{suffix}",
        slug=f"analytics-product-{suffix}",
        name=f"Analytics Product {suffix}",
        price=Decimal("20.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    db_session.add(product)
    await db_session.commit()

    yield product

    db_obj = await db_session.get(Product, product.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


async def test_dashboard_analytics_requires_reports_permission(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, limited_admin_credentials)
    response = await client.get("/api/v1/dashboard/analytics", headers=_auth(token))
    assert response.status_code == 403


async def test_dashboard_analytics_shape(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    response = await client.get("/api/v1/dashboard/analytics", headers=_auth(token))
    assert response.status_code == 200, response.text
    body = response.json()
    for key in (
        "most_viewed_products",
        "most_favorited_products",
        "most_added_to_cart_products",
        "most_requested_products",
        "popular_collections",
        "popular_categories",
    ):
        assert key in body
        assert isinstance(body[key], list)


async def test_product_views_are_counted_in_analytics(
    client: AsyncClient, admin_credentials: tuple[str, str], analytics_product: Product
) -> None:
    for _ in range(2):
        response = await client.get(f"/api/v1/storefront/products/{analytics_product.id}/detail")
        assert response.status_code == 200

    token = await _login(client, admin_credentials)
    response = await client.get("/api/v1/dashboard/analytics", headers=_auth(token))
    assert response.status_code == 200, response.text
    row = next(
        (
            p
            for p in response.json()["most_viewed_products"]
            if p["product_id"] == str(analytics_product.id)
        ),
        None,
    )
    assert row is not None
    assert row["count"] >= 2
