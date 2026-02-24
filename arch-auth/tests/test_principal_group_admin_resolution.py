from __future__ import annotations

import pytest

from api.auth import deps as auth_deps

pytestmark = pytest.mark.asyncio


async def test_principal_group_admin_resolved_from_admin_group_ids(monkeypatch):
    async def fake_get_jwks():
        return {"keys": []}

    def fake_decode(*_args, **_kwargs):
        return {
            "sub": "user-1",
            "preferred_username": "user-1",
            "email": "user-1@example.com",
            "realm_access": {"roles": []},
            "resource_access": {},
        }

    async def fake_get_admin_group_ids_for_user(_user_id: str) -> list[str]:
        return ["group-1"]

    monkeypatch.setattr(auth_deps, "_get_jwks", fake_get_jwks)
    monkeypatch.setattr(auth_deps.jwt, "decode", fake_decode)
    monkeypatch.setattr(
        auth_deps,
        "_get_admin_group_ids_for_user",
        fake_get_admin_group_ids_for_user,
    )

    principal = await auth_deps.get_current_principal(token="fake-token")

    assert principal.is_group_admin is True
    assert principal.admin_group_ids == ["group-1"]
    assert "group_admin" in principal.roles


async def test_principal_group_admin_not_derived_from_token_role(monkeypatch):
    async def fake_get_jwks():
        return {"keys": []}

    def fake_decode(*_args, **_kwargs):
        return {
            "sub": "user-2",
            "preferred_username": "user-2",
            "email": "user-2@example.com",
            "realm_access": {"roles": ["group_admin"]},
            "resource_access": {},
        }

    async def fake_get_admin_group_ids_for_user(_user_id: str) -> list[str]:
        return []

    monkeypatch.setattr(auth_deps, "_get_jwks", fake_get_jwks)
    monkeypatch.setattr(auth_deps.jwt, "decode", fake_decode)
    monkeypatch.setattr(
        auth_deps,
        "_get_admin_group_ids_for_user",
        fake_get_admin_group_ids_for_user,
    )

    principal = await auth_deps.get_current_principal(token="fake-token")

    assert principal.is_group_admin is False
    assert principal.admin_group_ids == []
    assert "group_admin" not in principal.roles

