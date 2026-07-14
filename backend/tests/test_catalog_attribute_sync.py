import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog.attribute_definition import AttributeDefinition
from app.models.catalog.attribute_set import AttributeSet
from app.models.catalog.attribute_set_item import AttributeSetItem
from app.models.catalog.category import Category
from app.models.catalog.product_type import ProductType
from app.models.catalog.unit import Unit
from app.models.enums import AttributeDataType
from tests.conftest import _purge_products


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _login(client: AsyncClient, credentials: tuple[str, str]) -> str:
    username, password = credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


class _TwoProductTypes:
    def __init__(
        self,
        attr_a: AttributeDefinition,
        attr_b: AttributeDefinition,
        type_a: ProductType,
        type_b: ProductType,
    ) -> None:
        self.attr_a = attr_a
        self.attr_b = attr_b
        self.type_a = type_a
        self.type_b = type_b


@pytest_asyncio.fixture
async def two_product_types(db_session: AsyncSession) -> AsyncGenerator[_TwoProductTypes]:
    """Two ProductTypes with disjoint AttributeSets, each with exactly one
    attribute carrying a default_value — enough to assert that switching a
    product's type both seeds the new type's defaults and drops the old
    type's now-invalid attribute values."""
    suffix = uuid.uuid4().hex[:8]

    attr_a = AttributeDefinition(
        code=f"sync_attr_a_{suffix}", name="Sync Attr A", data_type=AttributeDataType.STRING
    )
    attr_b = AttributeDefinition(
        code=f"sync_attr_b_{suffix}", name="Sync Attr B", data_type=AttributeDataType.STRING
    )
    db_session.add_all([attr_a, attr_b])
    await db_session.flush()

    set_a = AttributeSet(code=f"sync_set_a_{suffix}", name="Sync Set A")
    set_b = AttributeSet(code=f"sync_set_b_{suffix}", name="Sync Set B")
    db_session.add_all([set_a, set_b])
    await db_session.flush()

    db_session.add_all(
        [
            AttributeSetItem(
                attribute_set_id=set_a.id,
                attribute_definition_id=attr_a.id,
                default_value="default-a",
            ),
            AttributeSetItem(
                attribute_set_id=set_b.id,
                attribute_definition_id=attr_b.id,
                default_value="default-b",
            ),
        ]
    )
    await db_session.flush()

    type_a = ProductType(
        code=f"sync_type_a_{suffix}", name="Sync Type A", attribute_set_id=set_a.id
    )
    type_b = ProductType(
        code=f"sync_type_b_{suffix}", name="Sync Type B", attribute_set_id=set_b.id
    )
    db_session.add_all([type_a, type_b])
    await db_session.commit()

    yield _TwoProductTypes(attr_a, attr_b, type_a, type_b)

    await _purge_products(db_session, product_type_id=type_a.id)
    await _purge_products(db_session, product_type_id=type_b.id)
    for obj in (type_a, type_b, set_a, set_b, attr_a, attr_b):
        db_obj = await db_session.get(type(obj), obj.id)
        if db_obj:
            await db_session.delete(db_obj)
    await db_session.commit()


async def _attribute_codes(client: AsyncClient, token: str, product_id: str) -> set[str]:
    response = await client.get(
        "/api/v1/product-attributes", headers=_auth(token), params={"product_id": product_id}
    )
    assert response.status_code == 200
    attribute_ids = {item["attribute_definition_id"] for item in response.json()["items"]}
    defs = await client.get(
        "/api/v1/attribute-definitions", headers=_auth(token), params={"page_size": 100}
    )
    id_to_code = {d["id"]: d["code"] for d in defs.json()["items"]}
    return {id_to_code[i] for i in attribute_ids if i in id_to_code}


async def test_creating_product_seeds_default_attributes_for_its_type(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    two_product_types: _TwoProductTypes,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]

    response = await client.post(
        "/api/v1/products",
        headers=_auth(token),
        json={
            "category_id": str(test_category.id),
            "unit_id": str(test_unit.id),
            "product_type_id": str(two_product_types.type_a.id),
            "sku": f"SYNC-{suffix}",
            "slug": f"sync-{suffix}",
            "name": "Sync Test Product",
            "price": "10.00",
        },
    )
    assert response.status_code == 201, response.text
    product_id = response.json()["id"]

    codes = await _attribute_codes(client, token, product_id)
    assert two_product_types.attr_a.code in codes
    assert two_product_types.attr_b.code not in codes

    await client.delete(f"/api/v1/products/{product_id}", headers=_auth(token))


async def test_changing_product_type_resyncs_attributes_both_directions(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    two_product_types: _TwoProductTypes,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]

    create = await client.post(
        "/api/v1/products",
        headers=_auth(token),
        json={
            "category_id": str(test_category.id),
            "unit_id": str(test_unit.id),
            "product_type_id": str(two_product_types.type_a.id),
            "sku": f"SYNC2-{suffix}",
            "slug": f"sync2-{suffix}",
            "name": "Sync Test Product 2",
            "price": "10.00",
        },
    )
    product_id = create.json()["id"]
    assert two_product_types.attr_a.code in await _attribute_codes(client, token, product_id)

    # Switch to type B: attr_a's value should disappear, attr_b's default appears.
    switch_to_b = await client.patch(
        f"/api/v1/products/{product_id}",
        headers=_auth(token),
        json={"product_type_id": str(two_product_types.type_b.id)},
    )
    assert switch_to_b.status_code == 200, switch_to_b.text
    codes_after_b = await _attribute_codes(client, token, product_id)
    assert two_product_types.attr_b.code in codes_after_b
    assert two_product_types.attr_a.code not in codes_after_b

    # Switch back to type A: attr_b disappears, attr_a's default reappears.
    switch_to_a = await client.patch(
        f"/api/v1/products/{product_id}",
        headers=_auth(token),
        json={"product_type_id": str(two_product_types.type_a.id)},
    )
    assert switch_to_a.status_code == 200, switch_to_a.text
    codes_after_a = await _attribute_codes(client, token, product_id)
    assert two_product_types.attr_a.code in codes_after_a
    assert two_product_types.attr_b.code not in codes_after_a

    await client.delete(f"/api/v1/products/{product_id}", headers=_auth(token))
