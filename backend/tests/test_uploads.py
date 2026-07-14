import struct
import zlib

from httpx import AsyncClient


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _login(client: AsyncClient, credentials: tuple[str, str]) -> str:
    username, password = credentials
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _tiny_png() -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00" + bytes([255, 0, 0])))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


async def test_upload_stores_file_and_serves_it_back(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    content = _tiny_png()

    response = await client.post(
        "/api/v1/uploaded-files/upload",
        headers=_auth(token),
        files={"file": ("tiny.png", content, "image/png")},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["file_name"] == "tiny.png"
    assert body["mime_type"] == "image/png"
    assert body["size_bytes"] == len(content)
    assert body["file_path"].startswith("/media/")
    # The stored filename must never be the client-supplied one — avoids
    # both collisions and path-traversal via a crafted "filename".
    assert "tiny" not in body["file_path"]

    served = await client.get(body["file_path"])
    assert served.status_code == 200
    assert served.content == content

    await client.delete(f"/api/v1/uploaded-files/{body['id']}", headers=_auth(token))


async def test_upload_rejects_unsupported_extension(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    response = await client.post(
        "/api/v1/uploaded-files/upload",
        headers=_auth(token),
        files={"file": ("script.exe", b"not-a-real-executable", "application/octet-stream")},
    )
    assert response.status_code == 400


async def test_upload_rejects_oversized_file(
    client: AsyncClient, admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, admin_credentials)
    # Default MAX_UPLOAD_SIZE_MB is 10 — 11MB of arbitrary bytes with a
    # .png extension exercises the size check specifically (not the
    # extension one).
    oversized = b"\x00" * (11 * 1024 * 1024)

    response = await client.post(
        "/api/v1/uploaded-files/upload",
        headers=_auth(token),
        files={"file": ("big.png", oversized, "image/png")},
    )
    assert response.status_code == 400


async def test_upload_requires_permission(
    client: AsyncClient, limited_admin_credentials: tuple[str, str]
) -> None:
    token = await _login(client, limited_admin_credentials)
    response = await client.post(
        "/api/v1/uploaded-files/upload",
        headers=_auth(token),
        files={"file": ("tiny.png", _tiny_png(), "image/png")},
    )
    assert response.status_code == 403
