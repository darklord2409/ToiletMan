import uuid

from httpx import AsyncClient

from app.models.catalog.category import Category
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


async def test_create_product_with_translations_round_trips(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]

    response = await client.post(
        "/api/v1/products",
        headers=_auth(token),
        json={
            "category_id": str(test_category.id),
            "unit_id": str(test_unit.id),
            "product_type_id": str(test_product_type.id),
            "sku": f"SKU-{suffix}",
            "slug": f"product-{suffix}",
            "name": "Base Name",
            "price": "49.90",
            "translations": {
                "en": {"name": "English Name", "description": "English description"},
                "uz": {"name": "Uzbek Name"},
            },
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "draft"
    assert body["translations"]["en"]["name"] == "English Name"
    assert body["translations"]["uz"]["name"] == "Uzbek Name"
    product_id = body["id"]

    # Reads back the same way after a fresh GET (not just the create response).
    fetched = await client.get(f"/api/v1/products/{product_id}", headers=_auth(token))
    assert fetched.status_code == 200
    assert fetched.json()["translations"]["en"]["description"] == "English description"

    await client.delete(f"/api/v1/products/{product_id}", headers=_auth(token))


async def test_update_product_partial_fields_and_translations(
    client: AsyncClient, admin_credentials: tuple[str, str], test_product: object
) -> None:
    token = await _login(client, admin_credentials)
    product_id = test_product.id  # type: ignore[attr-defined]

    response = await client.patch(
        f"/api/v1/products/{product_id}",
        headers=_auth(token),
        json={
            "description": "Updated description",
            "translations": {"en": {"name": "Updated EN Name"}},
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["description"] == "Updated description"
    assert body["translations"]["en"]["name"] == "Updated EN Name"
    # Fields not included in the payload are untouched.
    assert body["name"] == test_product.name  # type: ignore[attr-defined]


async def test_soft_delete_excludes_product_from_list(
    client: AsyncClient, admin_credentials: tuple[str, str], test_product: object
) -> None:
    token = await _login(client, admin_credentials)
    product_id = str(test_product.id)  # type: ignore[attr-defined]

    delete_response = await client.delete(f"/api/v1/products/{product_id}", headers=_auth(token))
    assert delete_response.status_code == 204

    get_response = await client.get(f"/api/v1/products/{product_id}", headers=_auth(token))
    assert get_response.status_code == 404

    list_response = await client.get(
        "/api/v1/products", headers=_auth(token), params={"search": test_product.sku}  # type: ignore[attr-defined]
    )
    assert list_response.status_code == 200
    assert all(item["id"] != product_id for item in list_response.json()["items"])


async def test_create_product_with_unknown_category_is_rejected(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]

    response = await client.post(
        "/api/v1/products",
        headers=_auth(token),
        json={
            "category_id": str(uuid.uuid4()),
            "unit_id": str(test_unit.id),
            "product_type_id": str(test_product_type.id),
            "sku": f"SKU-{suffix}",
            "slug": f"product-{suffix}",
            "name": "Orphan Product",
            "price": "10.00",
        },
    )
    assert response.status_code in (400, 404, 409, 422)


async def test_full_text_search_finds_by_name_and_sku(
    client: AsyncClient, admin_credentials: tuple[str, str], test_product: object
) -> None:
    token = await _login(client, admin_credentials)

    by_name = await client.get(
        "/api/v1/products", headers=_auth(token), params={"search": test_product.name}  # type: ignore[attr-defined]
    )
    assert by_name.status_code == 200
    assert any(item["id"] == str(test_product.id) for item in by_name.json()["items"])  # type: ignore[attr-defined]

    by_sku = await client.get(
        "/api/v1/products", headers=_auth(token), params={"search": test_product.sku}  # type: ignore[attr-defined]
    )
    assert any(item["id"] == str(test_product.id) for item in by_sku.json()["items"])  # type: ignore[attr-defined]


async def test_availability_status_combinations(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]

    async def _create(**overrides: object) -> dict:
        payload = {
            "category_id": str(test_category.id),
            "unit_id": str(test_unit.id),
            "product_type_id": str(test_product_type.id),
            "sku": f"AVAIL-{suffix}-{overrides.get('_tag', '')}",
            "slug": f"avail-{suffix}-{overrides.get('_tag', '')}",
            "name": "Availability Test",
            "price": "10.00",
            "stock_quantity": overrides.get("stock_quantity", 0),
            "reserved_quantity": overrides.get("reserved_quantity", 0),
            "is_unlimited_stock": overrides.get("is_unlimited_stock", False),
            "low_stock_threshold": overrides.get("low_stock_threshold"),
        }
        resp = await client.post("/api/v1/products", headers=_auth(token), json=payload)
        assert resp.status_code == 201, resp.text
        return resp.json()

    out_of_stock = await _create(_tag="oos", stock_quantity=0)
    assert out_of_stock["available_quantity"] == 0
    assert out_of_stock["availability_status"] == "out_of_stock"

    low_stock = await _create(_tag="low", stock_quantity=5, low_stock_threshold=10)
    assert low_stock["available_quantity"] == 5
    assert low_stock["availability_status"] == "low_stock"

    in_stock = await _create(_tag="in", stock_quantity=50, low_stock_threshold=10)
    assert in_stock["available_quantity"] == 50
    assert in_stock["availability_status"] == "in_stock"

    unlimited = await _create(_tag="unl", stock_quantity=0, is_unlimited_stock=True)
    assert unlimited["availability_status"] == "unlimited"

    reserved = await _create(_tag="res", stock_quantity=10, reserved_quantity=4)
    assert reserved["available_quantity"] == 6
    assert reserved["availability_status"] == "in_stock"

    for product in (out_of_stock, low_stock, in_stock, unlimited, reserved):
        await client.delete(f"/api/v1/products/{product['id']}", headers=_auth(token))
