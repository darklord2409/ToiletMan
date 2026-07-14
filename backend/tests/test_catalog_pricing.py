import uuid
from datetime import UTC, datetime, timedelta

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
        "sku": f"PRICE-{suffix}",
        "slug": f"price-{suffix}",
        "name": "Pricing Test Product",
        "price": "100.00",
        **overrides,
    }
    response = await client.post("/api/v1/products", headers=_auth(token), json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def _price_history_for(client: AsyncClient, token: str, product_id: str) -> list[dict]:
    response = await client.get(
        "/api/v1/price-history", headers=_auth(token), params={"product_id": product_id}
    )
    assert response.status_code == 200
    return response.json()["items"]


async def test_price_history_recorded_on_create(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    product = await _create_product(client, token, test_category, test_unit, test_product_type)

    history = await _price_history_for(client, token, product["id"])
    assert len(history) == 1
    assert history[0]["old_price"] == history[0]["new_price"] == "100.00"

    await client.delete(f"/api/v1/products/{product['id']}", headers=_auth(token))


async def test_price_history_recorded_only_when_price_changes(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    product = await _create_product(client, token, test_category, test_unit, test_product_type)

    # Update a non-price field: no new history row.
    no_price_change = await client.patch(
        f"/api/v1/products/{product['id']}", headers=_auth(token), json={"description": "x"}
    )
    assert no_price_change.status_code == 200, no_price_change.text
    assert len(await _price_history_for(client, token, product["id"])) == 1

    # Update the price: exactly one new row.
    price_change = await client.patch(
        f"/api/v1/products/{product['id']}", headers=_auth(token), json={"price": "150.00"}
    )
    assert price_change.status_code == 200, price_change.text
    history = await _price_history_for(client, token, product["id"])
    assert len(history) == 2
    changed = [h for h in history if h["old_price"] == "100.00" and h["new_price"] == "150.00"]
    assert len(changed) == 1

    await client.delete(f"/api/v1/products/{product['id']}", headers=_auth(token))


async def test_bulk_price_adjust_percentage_increase(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    product = await _create_product(
        client, token, test_category, test_unit, test_product_type, price="100.00"
    )

    response = await client.post(
        "/api/v1/products/bulk/price-adjust",
        headers=_auth(token),
        json={
            "product_ids": [product["id"]],
            "mode": "percentage",
            "direction": "increase",
            "value": "10",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["updated_count"] == 1

    fetched = await client.get(f"/api/v1/products/{product['id']}", headers=_auth(token))
    assert fetched.json()["price"] == "110.00"

    await client.delete(f"/api/v1/products/{product['id']}", headers=_auth(token))


async def test_bulk_price_adjust_fixed_decrease_clamped_at_zero(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    product = await _create_product(
        client, token, test_category, test_unit, test_product_type, price="5.00"
    )

    response = await client.post(
        "/api/v1/products/bulk/price-adjust",
        headers=_auth(token),
        json={
            "product_ids": [product["id"]],
            "mode": "fixed",
            "direction": "decrease",
            "value": "50",
        },
    )
    assert response.status_code == 200, response.text

    fetched = await client.get(f"/api/v1/products/{product['id']}", headers=_auth(token))
    assert fetched.json()["price"] == "0.00"

    await client.delete(f"/api/v1/products/{product['id']}", headers=_auth(token))


async def test_price_rollback_reverts_price_and_records_new_history(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    product = await _create_product(
        client, token, test_category, test_unit, test_product_type, price="100.00"
    )
    initial_history_id = (await _price_history_for(client, token, product["id"]))[0]["id"]

    await client.patch(
        f"/api/v1/products/{product['id']}", headers=_auth(token), json={"price": "200.00"}
    )

    rollback = await client.post(
        f"/api/v1/products/{product['id']}/price-rollback",
        headers=_auth(token),
        json={"price_history_id": initial_history_id},
    )
    assert rollback.status_code == 200, rollback.text
    assert rollback.json()["price"] == "100.00"

    history = await _price_history_for(client, token, product["id"])
    assert len(history) == 3  # initial create, the 200.00 update, the rollback

    await client.delete(f"/api/v1/products/{product['id']}", headers=_auth(token))


async def test_apply_scheduled_prices_activates_due_future_price(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    product = await _create_product(
        client, token, test_category, test_unit, test_product_type, price="100.00"
    )

    due_time = (datetime.now(UTC) - timedelta(minutes=1)).isoformat()
    await client.patch(
        f"/api/v1/products/{product['id']}",
        headers=_auth(token),
        json={"future_price": "77.00", "future_price_activates_at": due_time},
    )

    response = await client.post(
        "/api/v1/products/apply-scheduled-prices", headers=_auth(token)
    )
    assert response.status_code == 200, response.text
    assert response.json()["updated_count"] >= 1

    fetched = await client.get(f"/api/v1/products/{product['id']}", headers=_auth(token))
    body = fetched.json()
    assert body["price"] == "77.00"
    assert body["future_price"] is None
    assert body["future_price_activates_at"] is None

    await client.delete(f"/api/v1/products/{product['id']}", headers=_auth(token))
