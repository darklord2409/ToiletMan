import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.catalog.category import Category
from app.models.catalog.product import Product
from app.models.catalog.product_image import ProductImage
from app.models.catalog.product_recommendation import ProductRecommendation
from app.models.catalog.product_type import ProductType
from app.models.catalog.unit import Unit
from app.models.content.banner import Banner
from app.models.enums import ProductStatus, RecommendationType
from app.models.users.customer import Customer


async def _delete_customer_if_orderless(db_session: AsyncSession, customer_id: uuid.UUID) -> None:
    """Order.customer_id is `ondelete="RESTRICT"` — intentional, so order
    history survives even if a customer record is later removed. A test
    customer who placed an order during the test can't be hard-deleted;
    leaving it behind is consistent with how other order-referencing test
    data is already handled elsewhere in this suite."""
    customer = await db_session.get(Customer, customer_id)
    if customer is None:
        return
    try:
        await db_session.delete(customer)
        await db_session.commit()
    except IntegrityError:
        await db_session.rollback()


@pytest_asyncio.fixture
async def test_customer(db_session: AsyncSession) -> AsyncGenerator[Customer]:
    suffix = uuid.uuid4().hex[:8]
    customer = Customer(
        telegram_id=int(suffix, 16) % 1_000_000_000,
        first_name="Storefront",
        last_name="Tester",
        is_active=True,
    )
    db_session.add(customer)
    await db_session.commit()

    yield customer

    await _delete_customer_if_orderless(db_session, customer.id)


@pytest_asyncio.fixture
def customer_auth_header(test_customer: Customer) -> dict[str, str]:
    token = create_access_token(str(test_customer.id), "customer")
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def second_customer(db_session: AsyncSession) -> AsyncGenerator[Customer]:
    """A distinct customer for the "can't view someone else's order" test —
    a dedicated fixture (set up before the test body starts making HTTP
    calls) rather than created inline, since interleaving raw `db_session`
    writes with `client` HTTP calls mid-test destabilizes the async
    connection pool (a "Future attached to a different loop" error)."""
    customer = Customer(telegram_id=int(uuid.uuid4().hex[:8], 16) % 1_000_000_000, is_active=True)
    db_session.add(customer)
    await db_session.commit()

    yield customer

    await _delete_customer_if_orderless(db_session, customer.id)


@pytest_asyncio.fixture
async def active_product(
    db_session: AsyncSession,
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> AsyncGenerator[Product]:
    """An explicitly ACTIVE, in-stock product — Product.status defaults to
    DRAFT at the model level, so storefront tests (which must only ever see
    active products) can't reuse conftest's `test_product` without
    confirming its status; building our own here is unambiguous."""
    suffix = uuid.uuid4().hex[:8]
    product = Product(
        category_id=test_category.id,
        unit_id=test_unit.id,
        product_type_id=test_product_type.id,
        sku=f"SF-{suffix}",
        slug=f"sf-product-{suffix}",
        name=f"Storefront Product {suffix}",
        price=Decimal("50.00"),
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


@pytest_asyncio.fixture
async def product_with_images(
    db_session: AsyncSession,
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> AsyncGenerator[Product]:
    suffix = uuid.uuid4().hex[:8]
    product = Product(
        category_id=test_category.id,
        unit_id=test_unit.id,
        product_type_id=test_product_type.id,
        sku=f"SF-IMG-{suffix}",
        slug=f"sf-image-product-{suffix}",
        name=f"Storefront Image Product {suffix}",
        price=Decimal("50.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    db_session.add(product)
    await db_session.commit()
    db_session.add_all(
        [
            ProductImage(product_id=product.id, url="https://x/primary.jpg", is_primary=True),
            ProductImage(product_id=product.id, url="https://x/other.jpg", sort_order=1),
        ]
    )
    await db_session.commit()

    yield product

    db_obj = await db_session.get(Product, product.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def accessory_recommendation(
    db_session: AsyncSession, active_product: Product, product_with_images: Product
) -> AsyncGenerator[ProductRecommendation]:
    recommendation = ProductRecommendation(
        product_id=active_product.id,
        recommended_product_id=product_with_images.id,
        relation_type=RecommendationType.ACCESSORY,
        sort_order=0,
    )
    db_session.add(recommendation)
    await db_session.commit()

    yield recommendation

    db_obj = await db_session.get(ProductRecommendation, recommendation.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def draft_product(
    db_session: AsyncSession,
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> AsyncGenerator[Product]:
    suffix = uuid.uuid4().hex[:8]
    product = Product(
        category_id=test_category.id,
        unit_id=test_unit.id,
        product_type_id=test_product_type.id,
        sku=f"SF-DRAFT-{suffix}",
        slug=f"sf-draft-product-{suffix}",
        name=f"Storefront Draft Product {suffix}",
        price=Decimal("50.00"),
        stock_quantity=10,
    )
    db_session.add(product)
    await db_session.commit()

    yield product

    db_obj = await db_session.get(Product, product.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def product_type_with_default_image(
    db_session: AsyncSession, test_product_type: ProductType
) -> AsyncGenerator[ProductType]:
    test_product_type.default_image_url = "https://x/type-default.jpg"
    await db_session.commit()

    yield test_product_type

    db_obj = await db_session.get(ProductType, test_product_type.id)
    if db_obj:
        db_obj.default_image_url = None
        await db_session.commit()


# ---------------------------------------------------------------------
# Catalog: public, no auth required, only ever shows active products
# ---------------------------------------------------------------------


async def test_list_products_only_returns_active(
    client: AsyncClient, active_product: Product, draft_product: Product
) -> None:
    # Scoped by SKU search rather than an unbounded page_size — the shared
    # dev catalog can hold far more than one page of real products, so
    # "just ask for a big page" isn't a reliable way to find these fixtures.
    response = await client.get(
        "/api/v1/storefront/products", params={"page_size": 100, "search": active_product.sku}
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["items"]}
    assert str(active_product.id) in ids
    assert str(draft_product.id) not in ids


async def test_list_products_includes_primary_image(
    client: AsyncClient, product_with_images: Product
) -> None:
    response = await client.get(
        "/api/v1/storefront/products",
        params={"page_size": 100, "search": product_with_images.sku},
    )
    assert response.status_code == 200
    item = next(i for i in response.json()["items"] if i["id"] == str(product_with_images.id))
    assert item["primary_image_url"] == "https://x/primary.jpg"


async def test_list_products_falls_back_to_product_type_default_image(
    client: AsyncClient, active_product: Product, product_type_with_default_image: ProductType
) -> None:
    response = await client.get(
        "/api/v1/storefront/products", params={"page_size": 100, "search": active_product.sku}
    )
    assert response.status_code == 200
    item = next(i for i in response.json()["items"] if i["id"] == str(active_product.id))
    assert item["primary_image_url"] == "https://x/type-default.jpg"


async def test_list_products_own_image_wins_over_product_type_default(
    client: AsyncClient,
    product_with_images: Product,
    product_type_with_default_image: ProductType,
) -> None:
    response = await client.get(
        "/api/v1/storefront/products",
        params={"page_size": 100, "search": product_with_images.sku},
    )
    assert response.status_code == 200
    item = next(i for i in response.json()["items"] if i["id"] == str(product_with_images.id))
    assert item["primary_image_url"] == "https://x/primary.jpg"


async def test_get_draft_product_is_not_found(client: AsyncClient, draft_product: Product) -> None:
    response = await client.get(f"/api/v1/storefront/products/{draft_product.id}")
    assert response.status_code == 404


async def test_product_detail_aggregates_side_tables(
    client: AsyncClient, active_product: Product
) -> None:
    response = await client.get(f"/api/v1/storefront/products/{active_product.id}/detail")
    assert response.status_code == 200
    body = response.json()
    assert body["product"]["id"] == str(active_product.id)
    assert body["images"] == []
    assert body["attributes"] == []


async def test_product_detail_recommendations_include_primary_image(
    client: AsyncClient, active_product: Product, product_with_images: Product
) -> None:
    # Both fixtures share `test_category` and `test_product_type` (and have
    # no manufacturer/collection), so each lands in the computed "similar"
    # group of the other — used here to confirm it carries a thumbnail, not
    # just bare ProductRead fields.
    response = await client.get(f"/api/v1/storefront/products/{active_product.id}/detail")
    assert response.status_code == 200
    similar = {r["id"]: r for r in response.json()["recommendations"]["similar"]}
    assert similar[str(product_with_images.id)]["primary_image_url"] == "https://x/primary.jpg"


async def test_product_detail_recommendations_curated_accessory(
    client: AsyncClient,
    active_product: Product,
    product_with_images: Product,
    accessory_recommendation: ProductRecommendation,
) -> None:
    response = await client.get(f"/api/v1/storefront/products/{active_product.id}/detail")
    assert response.status_code == 200
    body = response.json()["recommendations"]
    accessory_ids = {p["id"] for p in body["accessories"]}
    similar_ids = {p["id"] for p in body["similar"]}
    assert str(product_with_images.id) in accessory_ids
    # A curated pairing must not also double-count as a computed "similar"
    # match even though the two fixtures otherwise qualify for that group.
    assert str(product_with_images.id) not in similar_ids


async def test_categories_tree_is_public(client: AsyncClient, test_category: Category) -> None:
    response = await client.get("/api/v1/storefront/categories/tree")
    assert response.status_code == 200
    assert any(node["id"] == str(test_category.id) for node in response.json())


async def test_banners_excludes_inactive_and_expired(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    now = datetime.now(UTC)
    active = Banner(title="Active", image_url="https://x/a.jpg", is_active=True)
    inactive = Banner(title="Inactive", image_url="https://x/b.jpg", is_active=False)
    expired = Banner(
        title="Expired",
        image_url="https://x/c.jpg",
        is_active=True,
        ends_at=now - timedelta(days=1),
    )
    db_session.add_all([active, inactive, expired])
    await db_session.commit()

    response = await client.get("/api/v1/storefront/banners")
    assert response.status_code == 200
    titles = {b["title"] for b in response.json()}
    assert titles == {"Active"}

    for banner in (active, inactive, expired):
        db_obj = await db_session.get(Banner, banner.id)
        if db_obj:
            await db_session.delete(db_obj)
    await db_session.commit()


# ---------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------


async def test_cart_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/storefront/cart")
    assert response.status_code == 401


async def test_add_item_snapshots_price_and_computes_totals(
    client: AsyncClient, customer_auth_header: dict[str, str], active_product: Product
) -> None:
    response = await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 3},
        headers=customer_auth_header,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["item_count"] == 3
    assert body["subtotal"] == "150.00"
    assert body["items"][0]["unit_price"] == "50.00"
    assert body["items"][0]["product"]["availability_status"] == "in_stock"


async def test_add_item_rejects_quantity_over_stock(
    client: AsyncClient, customer_auth_header: dict[str, str], active_product: Product
) -> None:
    response = await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 999},
        headers=customer_auth_header,
    )
    assert response.status_code == 400


async def test_update_and_remove_cart_item(
    client: AsyncClient, customer_auth_header: dict[str, str], active_product: Product
) -> None:
    add_response = await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 1},
        headers=customer_auth_header,
    )
    item_id = add_response.json()["items"][0]["id"]

    update_response = await client.patch(
        f"/api/v1/storefront/cart/items/{item_id}",
        json={"quantity": 5},
        headers=customer_auth_header,
    )
    assert update_response.status_code == 200
    assert update_response.json()["item_count"] == 5

    remove_response = await client.delete(
        f"/api/v1/storefront/cart/items/{item_id}", headers=customer_auth_header
    )
    assert remove_response.status_code == 200
    assert remove_response.json()["items"] == []

    # A plain UniqueConstraint on (cart_id, product_id) would 409 here, since
    # the removed row still physically exists with deleted_at set — the
    # constraint must be scoped to non-deleted rows (see CartItem model).
    re_add_response = await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 1},
        headers=customer_auth_header,
    )
    assert re_add_response.status_code == 200
    assert re_add_response.json()["item_count"] == 1


async def test_clear_cart_then_re_add_same_product(
    client: AsyncClient, customer_auth_header: dict[str, str], active_product: Product
) -> None:
    await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 1},
        headers=customer_auth_header,
    )

    clear_response = await client.delete("/api/v1/storefront/cart", headers=customer_auth_header)
    assert clear_response.status_code == 200
    assert clear_response.json()["items"] == []

    re_add_response = await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 1},
        headers=customer_auth_header,
    )
    assert re_add_response.status_code == 200
    assert re_add_response.json()["item_count"] == 1


# ---------------------------------------------------------------------
# Favorites
# ---------------------------------------------------------------------


async def test_favorite_add_list_remove_is_idempotent(
    client: AsyncClient, customer_auth_header: dict[str, str], active_product: Product
) -> None:
    add_response = await client.post(
        "/api/v1/storefront/favorites",
        json={"product_id": str(active_product.id)},
        headers=customer_auth_header,
    )
    assert add_response.status_code == 201

    # Adding again shouldn't create a duplicate row (unique constraint on
    # customer_id+product_id) or error — it's a toggle-style UI action.
    second_add = await client.post(
        "/api/v1/storefront/favorites",
        json={"product_id": str(active_product.id)},
        headers=customer_auth_header,
    )
    assert second_add.status_code == 201

    list_response = await client.get("/api/v1/storefront/favorites", headers=customer_auth_header)
    assert len(list_response.json()) == 1

    remove_response = await client.delete(
        f"/api/v1/storefront/favorites/{active_product.id}", headers=customer_auth_header
    )
    assert remove_response.status_code == 204

    # Removing again (already gone) is still a no-op success, not a 404.
    second_remove = await client.delete(
        f"/api/v1/storefront/favorites/{active_product.id}", headers=customer_auth_header
    )
    assert second_remove.status_code == 204


# ---------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------


async def test_checkout_requires_a_non_empty_cart(
    client: AsyncClient, customer_auth_header: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/storefront/checkout",
        json={"contact_name": "A", "contact_phone": "+998900000000", "delivery_method": "pickup"},
        headers=customer_auth_header,
    )
    assert response.status_code == 400


async def test_checkout_delivery_requires_address(
    client: AsyncClient, customer_auth_header: dict[str, str], active_product: Product
) -> None:
    await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 1},
        headers=customer_auth_header,
    )
    response = await client.post(
        "/api/v1/storefront/checkout",
        json={"contact_name": "A", "contact_phone": "+998900000000", "delivery_method": "delivery"},
        headers=customer_auth_header,
    )
    assert response.status_code == 400


async def test_checkout_creates_order_and_clears_cart(
    client: AsyncClient, customer_auth_header: dict[str, str], active_product: Product
) -> None:
    await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 2},
        headers=customer_auth_header,
    )

    checkout_response = await client.post(
        "/api/v1/storefront/checkout",
        json={
            "contact_name": "Jane Buyer",
            "contact_phone": "+998901112233",
            "delivery_method": "pickup",
            "comment": "Ring the bell",
        },
        headers=customer_auth_header,
    )
    assert checkout_response.status_code == 201
    order = checkout_response.json()
    assert order["status"] == "pending"
    assert order["payment_method"] == "cash"
    assert order["grand_total"] == "100.00"
    assert len(order["items"]) == 1
    assert order["items"][0]["quantity"] == 2

    cart_response = await client.get("/api/v1/storefront/cart", headers=customer_auth_header)
    assert cart_response.json()["items"] == []

    orders_response = await client.get("/api/v1/storefront/orders", headers=customer_auth_header)
    assert any(o["id"] == order["id"] for o in orders_response.json()["items"])

    detail_response = await client.get(
        f"/api/v1/storefront/orders/{order['id']}", headers=customer_auth_header
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["items"][0]["product_name"] == active_product.name


async def test_cannot_view_another_customers_order(
    client: AsyncClient,
    customer_auth_header: dict[str, str],
    active_product: Product,
    second_customer: Customer,
) -> None:
    await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(active_product.id), "quantity": 1},
        headers=customer_auth_header,
    )
    checkout_response = await client.post(
        "/api/v1/storefront/checkout",
        json={"contact_name": "A", "contact_phone": "+998900000000", "delivery_method": "pickup"},
        headers=customer_auth_header,
    )
    order_id = checkout_response.json()["id"]

    other_token = create_access_token(str(second_customer.id), "customer")
    response = await client.get(
        f"/api/v1/storefront/orders/{order_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------
# Customer profile
# ---------------------------------------------------------------------


async def test_update_my_profile(
    client: AsyncClient, customer_auth_header: dict[str, str], test_customer: Customer
) -> None:
    response = await client.patch(
        "/api/v1/customer-auth/me",
        json={"first_name": "Updated", "phone": "+998907776655"},
        headers=customer_auth_header,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["first_name"] == "Updated"
    assert body["phone"] == "+998907776655"
