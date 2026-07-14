import uuid

from httpx import AsyncClient

from app.models.catalog.category import Category
from app.models.catalog.manufacturer import Manufacturer
from app.models.catalog.product_type import ProductType
from app.models.catalog.unit import Unit


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _login(client: AsyncClient, credentials: tuple[str, str]) -> str:
    username, password = credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def _create_product(
    client: AsyncClient,
    token: str,
    category: Category,
    unit: Unit,
    product_type: ProductType,
    **overrides: object,
) -> dict:
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "category_id": str(category.id),
        "unit_id": str(unit.id),
        "product_type_id": str(product_type.id),
        "sku": f"BULK-{suffix}",
        "slug": f"bulk-{suffix}",
        "name": "Bulk Test Product",
        "price": "20.00",
        "status": "active",
        **overrides,
    }
    response = await client.post("/api/v1/products", headers=_auth(token), json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def test_clone_resets_stock_status_and_barcode_but_copies_price(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    original = await _create_product(
        client,
        token,
        test_category,
        test_unit,
        test_product_type,
        stock_quantity=50,
        barcode=f"BC{uuid.uuid4().hex[:10]}",
        is_featured=True,
    )

    suffix = uuid.uuid4().hex[:8]
    clone = await client.post(
        f"/api/v1/products/{original['id']}/clone",
        headers=_auth(token),
        json={"new_sku": f"CLONE-{suffix}", "new_slug": f"clone-{suffix}"},
    )
    assert clone.status_code == 201, clone.text
    body = clone.json()

    assert body["sku"] == f"CLONE-{suffix}"
    assert body["slug"] == f"clone-{suffix}"
    assert body["status"] == "draft"
    assert body["stock_quantity"] == 0
    assert body["barcode"] is None
    assert body["is_featured"] is False
    assert body["price"] == original["price"]

    await client.delete(f"/api/v1/products/{original['id']}", headers=_auth(token))
    await client.delete(f"/api/v1/products/{body['id']}", headers=_auth(token))


async def test_clone_rejects_duplicate_sku(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    original = await _create_product(client, token, test_category, test_unit, test_product_type)

    response = await client.post(
        f"/api/v1/products/{original['id']}/clone",
        headers=_auth(token),
        json={"new_sku": original["sku"], "new_slug": "some-other-slug"},
    )
    assert response.status_code in (400, 409, 422)

    await client.delete(f"/api/v1/products/{original['id']}", headers=_auth(token))


async def test_bulk_status_change(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    p1 = await _create_product(client, token, test_category, test_unit, test_product_type)
    p2 = await _create_product(client, token, test_category, test_unit, test_product_type)

    response = await client.post(
        "/api/v1/products/bulk/status",
        headers=_auth(token),
        json={"product_ids": [p1["id"], p2["id"]], "status": "archived"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["updated_count"] == 2

    for pid in (p1["id"], p2["id"]):
        fetched = await client.get(f"/api/v1/products/{pid}", headers=_auth(token))
        assert fetched.json()["status"] == "archived"
        await client.delete(f"/api/v1/products/{pid}", headers=_auth(token))


async def test_bulk_manufacturer_and_category_change(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
    test_manufacturer: Manufacturer,
) -> None:
    token = await _login(client, admin_credentials)
    p1 = await _create_product(client, token, test_category, test_unit, test_product_type)

    manufacturer_change = await client.post(
        "/api/v1/products/bulk/manufacturer",
        headers=_auth(token),
        json={"product_ids": [p1["id"]], "manufacturer_id": str(test_manufacturer.id)},
    )
    assert manufacturer_change.status_code == 200, manufacturer_change.text

    fetched = await client.get(f"/api/v1/products/{p1['id']}", headers=_auth(token))
    assert fetched.json()["manufacturer_id"] == str(test_manufacturer.id)

    await client.delete(f"/api/v1/products/{p1['id']}", headers=_auth(token))


async def test_bulk_delete_soft_deletes_all_given_ids(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    p1 = await _create_product(client, token, test_category, test_unit, test_product_type)
    p2 = await _create_product(client, token, test_category, test_unit, test_product_type)

    response = await client.post(
        "/api/v1/products/bulk/delete",
        headers=_auth(token),
        json={"product_ids": [p1["id"], p2["id"]]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["updated_count"] == 2

    for pid in (p1["id"], p2["id"]):
        fetched = await client.get(f"/api/v1/products/{pid}", headers=_auth(token))
        assert fetched.status_code == 404
