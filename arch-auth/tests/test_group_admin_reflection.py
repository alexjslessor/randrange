from __future__ import annotations

from uuid import uuid4

import httpx
import pytest
from httpx import AsyncClient

from api.settings import get_settings

pytestmark = pytest.mark.asyncio


def bearer_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _kc_admin_token() -> str:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.KC_URL}/realms/master/protocol/openid-connect/token",
            data={
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": settings.KC_ADMIN_USERNAME,
                "password": settings.KC_ADMIN_PASSWORD,
            },
        )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def _ensure_kc_group(admin_token: str) -> str:
    settings = get_settings()
    headers = {"Authorization": f"Bearer {admin_token}"}
    async with httpx.AsyncClient() as client:
        groups_resp = await client.get(
            f"{settings.kc_admin_url}/groups",
            params={"max": 1},
            headers=headers,
        )
    groups_resp.raise_for_status()
    groups_payload = groups_resp.json()
    if isinstance(groups_payload, list) and groups_payload and groups_payload[0].get("id"):
        return str(groups_payload[0]["id"])

    group_name = f"test-group-{uuid4().hex[:8]}"
    async with httpx.AsyncClient() as client:
        create_resp = await client.post(
            f"{settings.kc_admin_url}/groups",
            json={"name": group_name},
            headers=headers,
        )
    create_resp.raise_for_status()
    location = create_resp.headers.get("Location", "")
    return location.rstrip("/").split("/")[-1]


async def _set_user_group_admin(user_id: str, group_id: str) -> None:
    settings = get_settings()
    admin_token = await _kc_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with httpx.AsyncClient() as client:
        membership_resp = await client.put(
            f"{settings.kc_admin_url}/users/{user_id}/groups/{group_id}",
            headers=headers,
        )
    membership_resp.raise_for_status()

    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            f"{settings.kc_admin_url}/users/{user_id}",
            headers=headers,
        )
    user_resp.raise_for_status()

    raw_user_payload = user_resp.json()
    user_payload = raw_user_payload if isinstance(raw_user_payload, dict) else {}
    attributes = user_payload.get("attributes")
    if not isinstance(attributes, dict):
        attributes = {}
    attributes["admin_group_ids"] = [group_id]
    update_payload = {
        "username": user_payload.get("username"),
        "email": user_payload.get("email"),
        "firstName": user_payload.get("firstName"),
        "lastName": user_payload.get("lastName"),
        "enabled": bool(user_payload.get("enabled", True)),
        "emailVerified": bool(user_payload.get("emailVerified", False)),
        "attributes": attributes,
        "requiredActions": user_payload.get("requiredActions", []),
    }

    async with httpx.AsyncClient() as client:
        update_resp = await client.put(
            f"{settings.kc_admin_url}/users/{user_id}",
            json=update_payload,
            headers=headers,
        )
    update_resp.raise_for_status()


async def test_group_admin_reflects_without_token_refresh(test_client: AsyncClient):
    username = f"group-admin-reflect-{uuid4().hex[:8]}"
    password = "qwerty123"
    email = f"{username}@example.com"

    register_resp = await test_client.post(
        "/register",
        json={
            "username": username,
            "email": email,
            "password": password,
        },
    )
    assert register_resp.status_code == 201

    login_resp = await test_client.post(
        "/login",
        data={
            "username": username,
            "password": password,
        },
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = bearer_headers(token)

    me_resp = await test_client.get("/users/me", headers=headers)
    assert me_resp.status_code == 200
    user_id = me_resp.json()["id"]

    forbidden_resp = await test_client.get("/admin/users", headers=headers)
    assert forbidden_resp.status_code == 403

    group_id = await _ensure_kc_group(await _kc_admin_token())
    await _set_user_group_admin(user_id=user_id, group_id=group_id)

    admin_users_resp = await test_client.get("/admin/users", headers=headers)
    assert admin_users_resp.status_code == 200
