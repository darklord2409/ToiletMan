import contextlib
import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.catalog.attribute_set import AttributeSet
from app.models.catalog.category import Category
from app.models.catalog.manufacturer import Manufacturer
from app.models.catalog.product import Product
from app.models.catalog.product_type import ProductType
from app.models.catalog.unit import Unit
from app.models.users.admin_user import AdminUser
from app.models.users.permission import Permission
from app.models.users.role import Role
from app.models.users.role_permission import RolePermission

# Tests run inside the backend container against the already-running
# uvicorn server on localhost:8000 (real HTTP, not httpx.ASGITransport —
# ASGITransport ties connection state to whatever event loop is active
# when it's created, which fought with this app's module-level DB/Redis
# singletons across pytest-asyncio's per-test event loops). Fixtures that
# need direct DB/Redis access below use their *own* throwaway engine/pool
# created fresh per test, for the same reason: never share an
# event-loop-bound resource across tests.
BASE_URL = "http://localhost:8000"


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession]:
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[Redis]:
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    yield redis
    await redis.aclose()


@pytest_asyncio.fixture(autouse=True)
async def _clear_rate_limits(redis_client: Redis) -> None:
    """The rate limiter is keyed by client IP, and the test client's IP is
    constant across every test — so the suite would trip its own login
    rate limit by the third or fourth test. Reset before *every* test;
    rate limiting itself is covered by its own dedicated test."""
    async for key in redis_client.scan_iter("ratelimit:*"):
        await redis_client.delete(key)


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient]:
    ac = AsyncClient(base_url=BASE_URL, timeout=10.0)
    try:
        yield ac
    finally:
        # httpx/httpcore's connection-pool teardown can lose the race
        # against pytest-asyncio closing the per-test event loop —
        # cosmetic only: it happens strictly after the test body (and its
        # assertions) have already completed, closing an idle connection.
        with contextlib.suppress(RuntimeError):
            await ac.aclose()


@pytest_asyncio.fixture
async def admin_credentials(db_session: AsyncSession) -> AsyncGenerator[tuple[str, str]]:
    """Creates a throwaway superuser for tests that need an authenticated
    admin session, and cleans it up afterwards."""
    username = f"test_admin_{uuid.uuid4().hex[:8]}"
    password = "TestPass123!"

    user = AdminUser(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password(password),
        is_active=True,
        is_superuser=True,
    )
    db_session.add(user)
    await db_session.commit()
    user_id = user.id

    yield username, password

    db_user = await db_session.get(AdminUser, user_id)
    if db_user:
        await db_session.delete(db_user)
        await db_session.commit()


@pytest_asyncio.fixture
async def limited_admin_credentials(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[str, str]]:
    """An admin with a fresh role granted exactly one permission
    (products.read), for asserting RBAC actually denies everything else."""
    suffix = uuid.uuid4().hex[:8]
    username = f"test_limited_{suffix}"
    password = "TestPass123!"
    role_name = f"test_role_{suffix}"

    role = Role(name=role_name)
    db_session.add(role)
    await db_session.flush()

    permission = (
        (await db_session.execute(select(Permission).where(Permission.code == "products.read")))
        .scalars()
        .first()
    )
    if permission is None:
        permission = Permission(code="products.read")
        db_session.add(permission)
        await db_session.flush()

    db_session.add(RolePermission(role_id=role.id, permission_id=permission.id))

    user = AdminUser(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password(password),
        is_active=True,
        is_superuser=False,
        role_id=role.id,
    )
    db_session.add(user)
    await db_session.commit()
    user_id = user.id
    role_id = role.id

    yield username, password

    db_user = await db_session.get(AdminUser, user_id)
    if db_user:
        await db_session.delete(db_user)
    db_role = await db_session.get(Role, role_id)
    if db_role:
        await db_session.delete(db_role)
    await db_session.commit()


# ----------------------------------------------------------------------
# Catalog fixtures: throwaway Category/Unit/Manufacturer/AttributeSet/
# ProductType/Product rows, created fresh per test and cleaned up after —
# tests must not depend on scripts/seed_catalog.py having been run.
# ----------------------------------------------------------------------


async def _purge_products(db_session: AsyncSession, **filters: uuid.UUID) -> None:
    """Hard-deletes any Product row matching `filters` (e.g. category_id=...)
    before a fixture removes its own row. Necessary because the API's
    DELETE endpoint only *soft*-deletes (`deleted_at`), so a product a test
    created and "deleted" via the API still physically exists and would
    otherwise violate the RESTRICT FK when the owning Category/Unit/
    ProductType fixture tears down."""
    stmt = select(Product)
    for column, value in filters.items():
        stmt = stmt.where(getattr(Product, column) == value)
    for product in (await db_session.execute(stmt)).scalars().all():
        await db_session.delete(product)
    await db_session.commit()


@pytest_asyncio.fixture
async def test_category(db_session: AsyncSession) -> AsyncGenerator[Category]:
    suffix = uuid.uuid4().hex[:8]
    category = Category(name=f"Test Category {suffix}", slug=f"test-category-{suffix}")
    db_session.add(category)
    await db_session.commit()

    yield category

    await _purge_products(db_session, category_id=category.id)
    db_obj = await db_session.get(Category, category.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def test_unit(db_session: AsyncSession) -> AsyncGenerator[Unit]:
    suffix = uuid.uuid4().hex[:8]
    unit = Unit(name=f"Test Unit {suffix}", symbol=f"tu{suffix}")
    db_session.add(unit)
    await db_session.commit()

    yield unit

    await _purge_products(db_session, unit_id=unit.id)
    db_obj = await db_session.get(Unit, unit.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def test_manufacturer(db_session: AsyncSession) -> AsyncGenerator[Manufacturer]:
    suffix = uuid.uuid4().hex[:8]
    manufacturer = Manufacturer(name=f"Test Mfr {suffix}", slug=f"test-mfr-{suffix}")
    db_session.add(manufacturer)
    await db_session.commit()

    yield manufacturer

    db_obj = await db_session.get(Manufacturer, manufacturer.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def test_attribute_set(db_session: AsyncSession) -> AsyncGenerator[AttributeSet]:
    """An empty attribute set (no items) — enough for tests that just need
    a valid product_type_id and don't care about EAV attribute-sync."""
    suffix = uuid.uuid4().hex[:8]
    attribute_set = AttributeSet(code=f"test_set_{suffix}", name=f"Test Set {suffix}")
    db_session.add(attribute_set)
    await db_session.commit()

    yield attribute_set

    db_obj = await db_session.get(AttributeSet, attribute_set.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def test_product_type(
    db_session: AsyncSession, test_attribute_set: AttributeSet
) -> AsyncGenerator[ProductType]:
    suffix = uuid.uuid4().hex[:8]
    product_type = ProductType(
        code=f"test_type_{suffix}",
        name=f"Test Type {suffix}",
        attribute_set_id=test_attribute_set.id,
    )
    db_session.add(product_type)
    await db_session.commit()

    yield product_type

    await _purge_products(db_session, product_type_id=product_type.id)
    db_obj = await db_session.get(ProductType, product_type.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()


@pytest_asyncio.fixture
async def test_product(
    db_session: AsyncSession,
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> AsyncGenerator[Product]:
    """A ready-made ACTIVE product for tests that need one to exist without
    exercising creation itself (pricing/search/bulk/clone tests)."""
    suffix = uuid.uuid4().hex[:8]
    product = Product(
        category_id=test_category.id,
        unit_id=test_unit.id,
        product_type_id=test_product_type.id,
        sku=f"TEST-{suffix}",
        slug=f"test-product-{suffix}",
        name=f"Test Product {suffix}",
        price=Decimal("100.00"),
        stock_quantity=20,
    )
    db_session.add(product)
    await db_session.commit()

    yield product

    db_obj = await db_session.get(Product, product.id)
    if db_obj:
        await db_session.delete(db_obj)
        await db_session.commit()
