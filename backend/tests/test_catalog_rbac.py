from httpx import AsyncClient


async def test_limited_role_cannot_read_product_types(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    """`limited_admin_credentials` (conftest.py) is granted only
    products.read — every other new catalog resource must stay denied."""
    username, password = limited_admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert login.status_code == 200
    access_token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/product-types", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 403


async def test_limited_role_cannot_write_reference_values(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    username, password = limited_admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    access_token = login.json()["access_token"]

    response = await client.post(
        "/api/v1/reference-values",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"reference_type": "material", "code": "rbac-test"},
    )
    assert response.status_code == 403


async def test_limited_role_cannot_run_bulk_price_adjust(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    """`prices.update` is a standalone permission, not part of the
    products.* action set — a role with only products.read must not be
    able to bulk-adjust prices."""
    username, password = limited_admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    access_token = login.json()["access_token"]

    response = await client.post(
        "/api/v1/products/bulk/price-adjust",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "product_ids": ["00000000-0000-0000-0000-000000000000"],
            "mode": "percentage",
            "direction": "increase",
            "value": "10",
        },
    )
    assert response.status_code == 403


async def test_superuser_can_access_every_new_catalog_resource(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    access_token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    for path in (
        "/api/v1/product-types",
        "/api/v1/attribute-sets",
        "/api/v1/attribute-set-items",
        "/api/v1/attribute-groups",
        "/api/v1/reference-values",
        "/api/v1/collections",
        "/api/v1/product-labels",
        "/api/v1/product-label-assignments",
        "/api/v1/product-documents",
        "/api/v1/product-videos",
    ):
        response = await client.get(path, headers=headers)
        assert response.status_code == 200, f"{path} -> {response.status_code}: {response.text}"
