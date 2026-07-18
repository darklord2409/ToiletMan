import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.catalog.attribute_set import AttributeSet
from app.models.catalog.category import Category
from app.models.catalog.product import Product
from app.models.catalog.product_type import ProductType
from app.models.catalog.unit import Unit
from app.models.commerce.discount import Discount
from app.models.enums import AmountType, DiscountScope, ProductStatus
from app.models.users.customer import Customer
from app.services.commerce.discount_engine import DiscountEngine

# NOTE ON STYLE IN THIS FILE: every test below builds and tears down its own
# rows inline (plain async helper functions, never `@pytest_asyncio.fixture`
# generators) and cleans up via a single Core-level `delete(Model).where(...)`
# batch at the very end, never the ORM's `session.delete(obj)`. Both choices
# are load-bearing, not stylistic: chained fixture teardowns and ORM-level
# deletes were each independently found to intermittently corrupt this
# suite's per-test asyncpg connection ("attached to a different loop" /
# "another operation is in progress"), silently leaving rows behind. Since a
# DiscountScope.ALL row discounts every product globally, one leftover row
# silently corrupts every other test that runs afterward — this was
# confirmed the hard way. Keep new tests in this file to the same shape.


async def _login(client: AsyncClient, credentials: tuple[str, str]) -> str:
    username, password = credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def _make_category(db_session: AsyncSession) -> Category:
    suffix = uuid.uuid4().hex[:8]
    category = Category(name=f"Discount Category {suffix}", slug=f"discount-category-{suffix}")
    db_session.add(category)
    await db_session.commit()
    return category


async def _make_product(db_session: AsyncSession, category: Category) -> Product:
    suffix = uuid.uuid4().hex[:8]
    unit = Unit(name=f"Discount Unit {suffix}", symbol=f"du{suffix}")
    attribute_set = AttributeSet(code=f"disc_set_{suffix}", name=f"Discount Set {suffix}")
    db_session.add_all([unit, attribute_set])
    await db_session.commit()

    product_type = ProductType(
        code=f"disc_type_{suffix}",
        name=f"Discount Type {suffix}",
        attribute_set_id=attribute_set.id,
    )
    db_session.add(product_type)
    await db_session.commit()

    product = Product(
        category_id=category.id,
        unit_id=unit.id,
        product_type_id=product_type.id,
        sku=f"DISC-{suffix}",
        slug=f"disc-product-{suffix}",
        name=f"Discount Product {suffix}",
        price=Decimal("100.00"),
        stock_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    db_session.add(product)
    await db_session.commit()
    return product


async def _make_customer(db_session: AsyncSession) -> Customer:
    suffix = uuid.uuid4().hex[:8]
    customer = Customer(
        telegram_id=int(suffix, 16) % 1_000_000_000,
        first_name="Discount",
        last_name="Tester",
        is_active=True,
    )
    db_session.add(customer)
    await db_session.commit()
    return customer


def _auth_header(customer: Customer) -> dict[str, str]:
    token = create_access_token(str(customer.id), "customer")
    return {"Authorization": f"Bearer {token}"}


async def _cleanup(
    db_session: AsyncSession,
    *,
    discount_ids: list[uuid.UUID] | None = None,
    product_ids: list[uuid.UUID] | None = None,
    category_ids: list[uuid.UUID] | None = None,
    customer_ids: list[uuid.UUID] | None = None,
) -> None:
    if discount_ids:
        await db_session.execute(delete(Discount).where(Discount.id.in_(discount_ids)))
    if product_ids:
        await db_session.execute(delete(Product).where(Product.id.in_(product_ids)))
    if category_ids:
        await db_session.execute(delete(Category).where(Category.id.in_(category_ids)))
    if customer_ids:
        await db_session.execute(delete(Customer).where(Customer.id.in_(customer_ids)))
    await db_session.commit()


# ---------------------------------------------------------------------
# DiscountEngine — pure resolution logic
# ---------------------------------------------------------------------


async def test_all_scope_percentage_discount_applies(db_session: AsyncSession) -> None:
    discount = Discount(
        scope=DiscountScope.ALL, amount_type=AmountType.PERCENTAGE, value=Decimal("20")
    )
    db_session.add(discount)
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, original = await engine.effective_price(
        product_id=uuid.uuid4(), category_id=None, price=Decimal("100.00")
    )
    assert price == Decimal("80.00")
    assert original == Decimal("100.00")

    await _cleanup(db_session, discount_ids=[discount.id])


async def test_fixed_amount_discount_applies(db_session: AsyncSession) -> None:
    discount = Discount(
        scope=DiscountScope.ALL, amount_type=AmountType.FIXED_AMOUNT, value=Decimal("15.00")
    )
    db_session.add(discount)
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, original = await engine.effective_price(
        product_id=uuid.uuid4(), category_id=None, price=Decimal("100.00")
    )
    assert price == Decimal("85.00")
    assert original == Decimal("100.00")

    await _cleanup(db_session, discount_ids=[discount.id])


async def test_fixed_amount_never_goes_below_zero(db_session: AsyncSession) -> None:
    discount = Discount(
        scope=DiscountScope.ALL, amount_type=AmountType.FIXED_AMOUNT, value=Decimal("500.00")
    )
    db_session.add(discount)
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, _ = await engine.effective_price(
        product_id=uuid.uuid4(), category_id=None, price=Decimal("100.00")
    )
    assert price == Decimal("0.00")

    await _cleanup(db_session, discount_ids=[discount.id])


async def test_inactive_discount_is_ignored(db_session: AsyncSession) -> None:
    discount = Discount(
        scope=DiscountScope.ALL,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("50"),
        is_active=False,
    )
    db_session.add(discount)
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, original = await engine.effective_price(
        product_id=uuid.uuid4(), category_id=None, price=Decimal("100.00")
    )
    assert price == Decimal("100.00")
    assert original is None

    await _cleanup(db_session, discount_ids=[discount.id])


async def test_expired_discount_is_ignored(db_session: AsyncSession) -> None:
    discount = Discount(
        scope=DiscountScope.ALL,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("50"),
        ends_at=datetime.now(UTC) - timedelta(days=1),
    )
    db_session.add(discount)
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, _ = await engine.effective_price(
        product_id=uuid.uuid4(), category_id=None, price=Decimal("100.00")
    )
    assert price == Decimal("100.00")

    await _cleanup(db_session, discount_ids=[discount.id])


async def test_not_yet_started_discount_is_ignored(db_session: AsyncSession) -> None:
    discount = Discount(
        scope=DiscountScope.ALL,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("50"),
        starts_at=datetime.now(UTC) + timedelta(days=1),
    )
    db_session.add(discount)
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, _ = await engine.effective_price(
        product_id=uuid.uuid4(), category_id=None, price=Decimal("100.00")
    )
    assert price == Decimal("100.00")

    await _cleanup(db_session, discount_ids=[discount.id])


async def test_product_scope_beats_category_and_all_scope(db_session: AsyncSession) -> None:
    category = await _make_category(db_session)
    product = await _make_product(db_session, category)

    all_discount = Discount(
        scope=DiscountScope.ALL, amount_type=AmountType.PERCENTAGE, value=Decimal("10")
    )
    category_discount = Discount(
        scope=DiscountScope.CATEGORY,
        category_id=category.id,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("20"),
    )
    product_discount = Discount(
        scope=DiscountScope.PRODUCT,
        product_id=product.id,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("30"),
    )
    db_session.add_all([all_discount, category_discount, product_discount])
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, _ = await engine.effective_price(
        product_id=product.id, category_id=category.id, price=Decimal("100.00")
    )
    assert price == Decimal("70.00")

    await _cleanup(
        db_session,
        discount_ids=[all_discount.id, category_discount.id, product_discount.id],
        product_ids=[product.id],
        category_ids=[category.id],
    )


async def test_category_scope_beats_all_scope(db_session: AsyncSession) -> None:
    category = await _make_category(db_session)

    all_discount = Discount(
        scope=DiscountScope.ALL, amount_type=AmountType.PERCENTAGE, value=Decimal("10")
    )
    category_discount = Discount(
        scope=DiscountScope.CATEGORY,
        category_id=category.id,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("25"),
    )
    db_session.add_all([all_discount, category_discount])
    await db_session.commit()

    engine = DiscountEngine(db_session)
    price, _ = await engine.effective_price(
        product_id=uuid.uuid4(), category_id=category.id, price=Decimal("100.00")
    )
    assert price == Decimal("75.00")

    await _cleanup(
        db_session,
        discount_ids=[all_discount.id, category_discount.id],
        category_ids=[category.id],
    )


# ---------------------------------------------------------------------
# Storefront integration — the price a shopper actually sees/pays
# ---------------------------------------------------------------------


async def test_storefront_list_reflects_category_discount(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    category = await _make_category(db_session)
    product = await _make_product(db_session, category)
    discount = Discount(
        scope=DiscountScope.CATEGORY,
        category_id=category.id,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("20"),
    )
    db_session.add(discount)
    await db_session.commit()

    response = await client.get(
        "/api/v1/storefront/products", params={"page_size": 100, "search": product.sku}
    )
    assert response.status_code == 200
    item = next(i for i in response.json()["items"] if i["id"] == str(product.id))
    assert item["price"] == "80.00"
    assert item["compare_at_price"] == "100.00"

    await _cleanup(
        db_session,
        discount_ids=[discount.id],
        product_ids=[product.id],
        category_ids=[category.id],
    )


async def test_storefront_detail_reflects_product_discount(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    category = await _make_category(db_session)
    product = await _make_product(db_session, category)
    discount = Discount(
        scope=DiscountScope.PRODUCT,
        product_id=product.id,
        amount_type=AmountType.FIXED_AMOUNT,
        value=Decimal("30.00"),
    )
    db_session.add(discount)
    await db_session.commit()

    response = await client.get(f"/api/v1/storefront/products/{product.id}/detail")
    assert response.status_code == 200
    body = response.json()["product"]
    assert body["price"] == "70.00"
    assert body["compare_at_price"] == "100.00"

    await _cleanup(
        db_session,
        discount_ids=[discount.id],
        product_ids=[product.id],
        category_ids=[category.id],
    )


async def test_storefront_without_active_discount_keeps_stored_price(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    category = await _make_category(db_session)
    product = await _make_product(db_session, category)

    response = await client.get(f"/api/v1/storefront/products/{product.id}/detail")
    assert response.status_code == 200
    body = response.json()["product"]
    assert body["price"] == "100.00"
    assert body["compare_at_price"] is None

    await _cleanup(db_session, product_ids=[product.id], category_ids=[category.id])


async def test_cart_add_item_snapshots_discounted_price(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    category = await _make_category(db_session)
    product = await _make_product(db_session, category)
    customer = await _make_customer(db_session)
    discount = Discount(
        scope=DiscountScope.PRODUCT,
        product_id=product.id,
        amount_type=AmountType.PERCENTAGE,
        value=Decimal("25"),
    )
    db_session.add(discount)
    await db_session.commit()

    response = await client.post(
        "/api/v1/storefront/cart/items",
        json={"product_id": str(product.id), "quantity": 2},
        headers=_auth_header(customer),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["unit_price"] == "75.00"
    assert body["subtotal"] == "150.00"

    await _cleanup(
        db_session,
        discount_ids=[discount.id],
        product_ids=[product.id],
        category_ids=[category.id],
        customer_ids=[customer.id],
    )


# ---------------------------------------------------------------------
# Admin API — scope/target validation
# ---------------------------------------------------------------------


async def test_create_category_discount_requires_category_id(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    response = await client.post(
        "/api/v1/discounts",
        json={"scope": "category", "amount_type": "percentage", "value": "10"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


async def test_create_product_discount_requires_product_id(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    response = await client.post(
        "/api/v1/discounts",
        json={"scope": "product", "amount_type": "percentage", "value": "10"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


async def test_create_all_scope_discount_clears_stray_category_id(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    # Deliberately 100% HTTP, no direct db_session use at all (not even for
    # cleanup) — see the module note on why extra db_session round trips
    # per test are avoided in this file wherever an equivalent API call
    # exists. A real category is fetched through the admin API itself,
    # purely as a valid FK value for the stray `category_id` this test
    # expects the create call to discard.
    token = await _login(client, admin_credentials)
    headers = {"Authorization": f"Bearer {token}"}
    categories_response = await client.get(
        "/api/v1/categories", params={"page_size": 1}, headers=headers
    )
    existing_category_id = categories_response.json()["items"][0]["id"]

    response = await client.post(
        "/api/v1/discounts",
        json={
            "name": "Storewide test sale",
            "scope": "all",
            "category_id": existing_category_id,
            "amount_type": "percentage",
            "value": "10",
        },
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["category_id"] is None

    await client.delete(f"/api/v1/discounts/{body['id']}", headers=headers)
