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


def _csv_bytes(rows: list[str], header: str) -> bytes:
    return ("\n".join([header, *rows]) + "\n").encode("utf-8")


_FULL_MODE_HEADER = "sku,name,category,unit,product_type,price,stock_quantity"


def _full_mode_row(
    sku: str, name: str, category: Category, unit: Unit, product_type: ProductType, price: str
) -> str:
    return f"{sku},{name},{category.slug},{unit.symbol},{product_type.code},{price},5"


async def test_import_preview_is_dry_run_and_reports_errors(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]
    sku = f"IMP-{suffix}"

    good_row = _full_mode_row(
        sku, "Imported Product", test_category, test_unit, test_product_type, "9.99"
    )
    content = _csv_bytes([good_row, ",Missing SKU Row,,,,,"], header=_FULL_MODE_HEADER)

    response = await client.post(
        "/api/v1/products/import/preview",
        headers=_auth(token),
        params={"mode": "full"},
        files={"file": ("products.csv", content, "text/csv")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total_rows"] == 2
    assert body["create_count"] == 1
    assert body["invalid_rows"] == 1

    rows_by_action = {r["action"] for r in body["rows"]}
    assert "create" in rows_by_action
    assert "skip" in rows_by_action

    # Dry run: nothing was actually written.
    lookup = await client.get(
        "/api/v1/products", headers=_auth(token), params={"search": sku}
    )
    assert all(item["sku"] != sku for item in lookup.json()["items"])


async def test_import_commit_creates_then_updates_on_second_pass(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]
    sku = f"IMP2-{suffix}"

    first_row = _full_mode_row(
        sku, "Imported Product", test_category, test_unit, test_product_type, "9.99"
    )
    first_pass = _csv_bytes([first_row], _FULL_MODE_HEADER)
    commit1 = await client.post(
        "/api/v1/products/import/commit",
        headers=_auth(token),
        params={"mode": "full", "atomic": "false"},
        files={"file": ("products.csv", first_pass, "text/csv")},
    )
    assert commit1.status_code == 200, commit1.text
    assert commit1.json()["created_count"] == 1

    second_row = _full_mode_row(
        sku, "Renamed Product", test_category, test_unit, test_product_type, "19.99"
    )
    second_pass = _csv_bytes([second_row], _FULL_MODE_HEADER)
    commit2 = await client.post(
        "/api/v1/products/import/commit",
        headers=_auth(token),
        params={"mode": "full", "atomic": "false"},
        files={"file": ("products.csv", second_pass, "text/csv")},
    )
    assert commit2.status_code == 200, commit2.text
    assert commit2.json()["updated_count"] == 1
    assert commit2.json()["created_count"] == 0

    lookup = await client.get("/api/v1/products", headers=_auth(token), params={"search": sku})
    matches = [item for item in lookup.json()["items"] if item["sku"] == sku]
    assert len(matches) == 1
    assert matches[0]["name"] == "Renamed Product"
    assert matches[0]["price"] == "19.99"

    await client.delete(f"/api/v1/products/{matches[0]['id']}", headers=_auth(token))


async def test_price_only_mode_rejects_creating_unknown_sku(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]
    content = _csv_bytes([f"NEVER-EXISTS-{suffix},15.00"], header="sku,price")

    response = await client.post(
        "/api/v1/products/import/commit",
        headers=_auth(token),
        params={"mode": "price_only", "atomic": "false"},
        files={"file": ("prices.csv", content, "text/csv")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["created_count"] == 0
    assert body["updated_count"] == 0
    assert body["skipped_count"] == 1
    assert "does not exist" in body["errors"][0]["message"]


async def test_stock_only_mode_rejects_creating_unknown_sku(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]
    content = _csv_bytes([f"NEVER-EXISTS-{suffix},7"], header="sku,stock_quantity")

    response = await client.post(
        "/api/v1/products/import/commit",
        headers=_auth(token),
        params={"mode": "stock_only", "atomic": "false"},
        files={"file": ("stock.csv", content, "text/csv")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["created_count"] == 0
    assert body["updated_count"] == 0
    assert body["skipped_count"] == 1


async def test_atomic_commit_writes_nothing_if_any_row_is_invalid(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_category: Category,
    test_unit: Unit,
    test_product_type: ProductType,
) -> None:
    token = await _login(client, admin_credentials)
    suffix = uuid.uuid4().hex[:8]
    good_sku = f"ATOMIC-GOOD-{suffix}"
    good_row = _full_mode_row(
        good_sku, "Good Row", test_category, test_unit, test_product_type, "9.99"
    )
    content = _csv_bytes([good_row, ",Bad Row,,,,,"], _FULL_MODE_HEADER)

    response = await client.post(
        "/api/v1/products/import/commit",
        headers=_auth(token),
        params={"mode": "full", "atomic": "true"},
        files={"file": ("products.csv", content, "text/csv")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["created_count"] == 0
    assert body["updated_count"] == 0

    lookup = await client.get(
        "/api/v1/products", headers=_auth(token), params={"search": good_sku}
    )
    assert all(item["sku"] != good_sku for item in lookup.json()["items"])


async def test_export_returns_csv_with_expected_row(
    client: AsyncClient,
    admin_credentials: tuple[str, str],
    test_product: object,
) -> None:
    token = await _login(client, admin_credentials)

    response = await client.get(
        "/api/v1/products/export",
        headers=_auth(token),
        params={"fmt": "csv", "product_ids": str(test_product.id)},  # type: ignore[attr-defined]
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    text = response.content.decode("utf-8-sig")
    assert "sku" in text.splitlines()[0]
    assert test_product.sku in text  # type: ignore[attr-defined]
