from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

@pytest.fixture
def user_credentials() -> dict[str, str]:
    username = f"alex-{uuid4().hex[:8]}"
    return {
        "username": username,
        "email": f"{username}@example.com",
        "password": "qwerty123",
    }


async def register_user(client: AsyncClient, credentials: dict[str, str]) -> dict:
    response = await client.post(
        "/register",
        json={
            "username": credentials["username"],
            "email": credentials["email"],
            "password": credentials["password"],
        },
    )
    assert response.status_code == 201, f"{response.json()} - {response.status_code}"
    return response.json()


async def login_user(client: AsyncClient, credentials: dict[str, str]) -> dict:
    response = await client.post(
        "/login",
        data={
            "username": credentials["username"],
            "password": credentials["password"],
        },
    )
    assert response.status_code == 200, f"{response.json()} - {response.status_code}"

    body = response.json()
    assert "access_token" in body, f"Access token not found in response: {body}"
    assert "refresh_token" in body, f"Refresh token not found in response: {body}"
    assert str(body.get("token_type", "")).lower() == "bearer", f"Token type mismatch: {body}"
    return body


def bearer_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# @pytest.mark.asyncio
async def test_register_user(test_client: AsyncClient, user_credentials: dict[str, str]):
    body = await register_user(test_client, user_credentials)
    assert body["username"] == user_credentials["username"]


# @pytest.mark.asyncio
async def test_login_user(test_client: AsyncClient, user_credentials: dict[str, str]):
    await register_user(test_client, user_credentials)
    await login_user(test_client, user_credentials)


# @pytest.mark.asyncio
async def test_get_current_user(test_client: AsyncClient, user_credentials: dict[str, str]):
    await register_user(test_client, user_credentials)
    tokens = await login_user(test_client, user_credentials)

    response = await test_client.get(
        "/users/me",
        headers=bearer_headers(tokens["access_token"]),
    )
    assert response.status_code == 200, f"{response.json()} - {response.status_code}"
    assert response.json()["username"] == user_credentials["username"]


# @pytest.mark.asyncio
async def test_refresh_token(
    test_client: AsyncClient, 
    user_credentials: dict[str, str],
):
    await register_user(test_client, user_credentials)
    tokens = await login_user(test_client, user_credentials)

    response = await test_client.post(
        "/refresh",
        data={
            "username": "",
            "password": tokens["refresh_token"],
        },
    )
    assert response.status_code == 200, f"{response.json()} - {response.status_code}"
    assert "access_token" in response.json(), f"Access token not found in response: {response.json()}"


# @pytest.mark.asyncio
async def test_admin_route_forbidden_for_user(
    test_client: AsyncClient,
    user_credentials: dict[str, str],
):
    await register_user(test_client, user_credentials)
    tokens = await login_user(test_client, user_credentials)

    response = await test_client.get(
        "/admin/users",
        headers=bearer_headers(tokens["access_token"]),
    )
    assert response.status_code == 403, f"{response.json()} - {response.status_code}"


# @pytest.mark.asyncio
async def test_delete_user_requires_superuser(
    test_client: AsyncClient, 
    user_credentials: dict[str, str],
):
    await register_user(test_client, user_credentials)
    tokens = await login_user(test_client, user_credentials)
    headers = bearer_headers(tokens["access_token"])

    current_user_response = await test_client.get("/users/me", headers=headers)
    assert current_user_response.status_code == 200, (
        f"{current_user_response.json()} - {current_user_response.status_code}"
    )
    user_id = current_user_response.json()["id"]

    delete_response = await test_client.delete(f"/admin/users/{user_id}", headers=headers)
    assert delete_response.status_code == 403, (
        f"{delete_response.json()} - {delete_response.status_code}"
    )


# @pytest.mark.asyncio
async def test_invalid_token_access(
    test_client: AsyncClient,
):
    response = await test_client.get(
        "/users/me",
        headers=bearer_headers("invalid.token.here"),
    )
    assert response.status_code == 401, f"{response.json()} - {response.status_code}"
