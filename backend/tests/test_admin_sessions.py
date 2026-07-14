from httpx import AsyncClient


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _login(client: AsyncClient, username: str, password: str) -> dict:
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()


async def test_list_sessions_includes_recent_logins(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    first_login = await _login(client, username, password)
    second_login = await _login(client, username, password)

    me = await client.get(
        "/api/v1/auth/me", headers=_auth(first_login["access_token"])
    )
    user_id = me.json()["id"]

    sessions = await client.get(
        f"/api/v1/admin-users/{user_id}/sessions", headers=_auth(first_login["access_token"])
    )
    assert sessions.status_code == 200, sessions.text
    body = sessions.json()
    assert len(body) >= 2
    for entry in body:
        assert "jti" in entry

    await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": first_login["refresh_token"]},
        headers=_auth(first_login["access_token"]),
    )
    await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": second_login["refresh_token"]},
        headers=_auth(second_login["access_token"]),
    )


async def test_revoke_one_session_ends_only_that_refresh_token(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await _login(client, username, password)
    me = await client.get("/api/v1/auth/me", headers=_auth(login["access_token"]))
    user_id = me.json()["id"]

    sessions = await client.get(
        f"/api/v1/admin-users/{user_id}/sessions", headers=_auth(login["access_token"])
    )
    jtis_before = {s["jti"] for s in sessions.json()}
    assert jtis_before

    # Find the jti belonging to *this* refresh token by process of
    # elimination: revoke each candidate isn't feasible without exposing
    # the jti directly, so instead confirm revoking an arbitrary one of
    # this user's sessions removes exactly one entry from the list.
    target_jti = next(iter(jtis_before))
    revoke = await client.delete(
        f"/api/v1/admin-users/{user_id}/sessions/{target_jti}", headers=_auth(login["access_token"])
    )
    assert revoke.status_code == 204

    sessions_after = await client.get(
        f"/api/v1/admin-users/{user_id}/sessions", headers=_auth(login["access_token"])
    )
    jtis_after = {s["jti"] for s in sessions_after.json()}
    assert target_jti not in jtis_after
    assert jtis_after == jtis_before - {target_jti}


async def test_revoke_unknown_jti_returns_404(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await _login(client, username, password)
    me = await client.get("/api/v1/auth/me", headers=_auth(login["access_token"]))
    user_id = me.json()["id"]

    response = await client.delete(
        f"/api/v1/admin-users/{user_id}/sessions/does-not-exist",
        headers=_auth(login["access_token"]),
    )
    assert response.status_code == 404


async def test_revoke_all_sessions_clears_the_list(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    username, password = admin_credentials
    login = await _login(client, username, password)
    me = await client.get("/api/v1/auth/me", headers=_auth(login["access_token"]))
    user_id = me.json()["id"]

    revoke_all = await client.delete(
        f"/api/v1/admin-users/{user_id}/sessions", headers=_auth(login["access_token"])
    )
    assert revoke_all.status_code == 204

    sessions_after = await client.get(
        f"/api/v1/admin-users/{user_id}/sessions", headers=_auth(login["access_token"])
    )
    # The revoke-all call itself doesn't invalidate the *access* token used
    # to make this follow-up GET (only refresh tokens are tracked), so the
    # request still succeeds — it should just report zero sessions.
    assert sessions_after.status_code == 200
    assert sessions_after.json() == []


async def test_sessions_endpoints_require_admin_users_update_permission(
    client: AsyncClient,
    limited_admin_credentials: tuple[str, str],
    admin_credentials: tuple[str, str],
) -> None:
    limited_username, limited_password = limited_admin_credentials
    limited_login = await _login(client, limited_username, limited_password)

    admin_username, admin_password = admin_credentials
    admin_login = await _login(client, admin_username, admin_password)
    admin_me = await client.get("/api/v1/auth/me", headers=_auth(admin_login["access_token"]))
    admin_id = admin_me.json()["id"]

    response = await client.get(
        f"/api/v1/admin-users/{admin_id}/sessions", headers=_auth(limited_login["access_token"])
    )
    assert response.status_code == 403
