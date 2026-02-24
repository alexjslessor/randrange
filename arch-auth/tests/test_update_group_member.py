from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from api.auth.deps import Principal, require_superuser_or_group_admin
from api.main import app

pytestmark = pytest.mark.asyncio

_SUPERUSER = Principal(
    user_id="su-1",
    username="superuser",
    email="su@example.com",
    is_superuser=True,
)


@pytest.fixture(autouse=True)
def override_superuser():
    app.dependency_overrides[require_superuser_or_group_admin] = lambda: _SUPERUSER
    yield
    app.dependency_overrides.pop(require_superuser_or_group_admin, None)


async def test_patch_group_member_sets_admin(test_client: AsyncClient):
    with (
        patch(
            "api.routers.auth_routes._kc_admin_token",
            new_callable=AsyncMock,
            return_value="tok",
        ),
        patch(
            "api.routers.auth_routes._sync_user_admin_group_membership",
            new_callable=AsyncMock,
        ) as mock_sync,
    ):
        resp = await test_client.patch(
            "/admin/groups/group-1/users/user-1",
            json={"is_group_admin": True},
        )

    assert resp.status_code == 204
    mock_sync.assert_awaited_once_with(
        client=mock_sync.call_args.kwargs["client"],
        admin_token="tok",
        user_id="user-1",
        group_id="group-1",
        is_group_admin=True,
    )


async def test_patch_group_member_removes_admin(test_client: AsyncClient):
    with (
        patch(
            "api.routers.auth_routes._kc_admin_token",
            new_callable=AsyncMock,
            return_value="tok",
        ),
        patch(
            "api.routers.auth_routes._sync_user_admin_group_membership",
            new_callable=AsyncMock,
        ) as mock_sync,
    ):
        resp = await test_client.patch(
            "/admin/groups/group-1/users/user-1",
            json={"is_group_admin": False},
        )

    assert resp.status_code == 204
    mock_sync.assert_awaited_once_with(
        client=mock_sync.call_args.kwargs["client"],
        admin_token="tok",
        user_id="user-1",
        group_id="group-1",
        is_group_admin=False,
    )


async def test_patch_group_member_requires_superuser(test_client: AsyncClient):
    app.dependency_overrides.pop(require_superuser_or_group_admin, None)

    resp = await test_client.patch(
        "/admin/groups/group-1/users/user-1",
        json={"is_group_admin": True},
    )

    assert resp.status_code == 401
