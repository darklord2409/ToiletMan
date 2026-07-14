from httpx import AsyncClient


async def test_limited_role_can_read_but_not_write(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    username, password = limited_admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert login.status_code == 200
    access_token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    read_response = await client.get("/api/v1/products", headers=headers)
    assert read_response.status_code == 200

    create_response = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "category_id": "00000000-0000-0000-0000-000000000000",
            "unit_id": "00000000-0000-0000-0000-000000000000",
            "sku": "RBAC-TEST",
            "slug": "rbac-test",
            "name": "RBAC Test Product",
            "price": "1.00",
        },
    )
    assert create_response.status_code == 403
    assert "detail" in create_response.json()


async def test_limited_role_cannot_read_unrelated_resource(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    username, password = limited_admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    access_token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/admin-users", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 403


async def test_superuser_bypasses_rbac(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    access_token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/admin-users", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
