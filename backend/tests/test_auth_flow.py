import uuid

from httpx import AsyncClient


async def test_unauthenticated_request_is_rejected(client: AsyncClient) -> None:
    response = await client.get("/api/v1/products")
    assert response.status_code == 401


async def test_login_returns_token_pair(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_login_with_wrong_password_is_rejected(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, _ = admin_credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": "wrong-password"}
    )
    assert response.status_code == 401


async def test_me_returns_current_user(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    access_token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["username"] == username


async def test_refresh_rotates_token_and_revokes_old_one(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    old_refresh = login.json()["refresh_token"]

    refreshed = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200
    assert refreshed.json()["refresh_token"] != old_refresh

    reused = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401


async def test_logout_revokes_refresh_token(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    access_token = login.json()["access_token"]
    refresh_token = login.json()["refresh_token"]

    logout = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert logout.status_code == 204

    reused = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reused.status_code == 401


async def test_customer_token_rejected_on_admin_endpoint(client: AsyncClient) -> None:
    email = f"flow-test-{uuid.uuid4().hex[:8]}@example.com"
    register = await client.post(
        "/api/v1/customer-auth/register",
        json={"email": email, "password": "Str0ng!Passw0rd"},
    )
    assert register.status_code == 201
    customer_token = register.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert response.status_code == 401


async def test_weak_password_rejected_with_localized_message(client: AsyncClient) -> None:
    # Password strength is a business rule (BadRequestError -> 400), not a
    # schema-shape violation (which FastAPI/Pydantic report as 422).
    email = f"weakpass-{uuid.uuid4().hex[:8]}@example.com"
    response = await client.post(
        "/api/v1/customer-auth/register",
        json={"email": email, "password": "weak"},
    )
    assert response.status_code == 400
    assert "8" in response.json()["detail"]
