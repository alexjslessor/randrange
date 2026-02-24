from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException, status
from httpx import AsyncClient

from api.auth.deps import Principal, require_superuser_or_group_admin
from api.main import app
from api.routers.auth_routes import _group_in_scope, _user_in_scope

pytestmark = pytest.mark.asyncio

_GROUP_ADMIN = Principal(
    user_id="ga-1",
    username="group-admin",
    email="ga@example.com",
    is_superuser=False,
    is_group_admin=True,
    admin_group_ids=["group-1"],
)

_SUPERUSER = Principal(
    user_id="su-1",
    username="superuser",
    email="su@example.com",
    is_superuser=True,
    is_group_admin=False,
    admin_group_ids=[],
)


@pytest.fixture(autouse=True)
def override_group_admin():
    app.dependency_overrides[require_superuser_or_group_admin] = lambda: _GROUP_ADMIN
    yield
    app.dependency_overrides.pop(require_superuser_or_group_admin, None)


async def test_group_scope_helper_respects_admin_groups():
    assert _group_in_scope(_GROUP_ADMIN, "group-1") is True
    assert _group_in_scope(_GROUP_ADMIN, "group-2") is False
    assert _group_in_scope(_SUPERUSER, "group-2") is True


async def test_user_scope_helper_requires_group_overlap():
    assert _user_in_scope(_GROUP_ADMIN, ["group-1"]) is True
    assert _user_in_scope(_GROUP_ADMIN, ["group-9", "group-1"]) is True
    assert _user_in_scope(_GROUP_ADMIN, ["group-9"]) is False
    assert _user_in_scope(_SUPERUSER, []) is True


async def test_list_permissions_scopes_group_admin_results(test_client: AsyncClient):
    all_permissions = [
        {
            "type": "group",
            "kc_group_id": "group-1",
            "resource_type": "deployment",
            "resource_external_id": "dep-1",
            "permission_code": "deployment:read",
        },
        {
            "type": "group",
            "kc_group_id": "group-2",
            "resource_type": "deployment",
            "resource_external_id": "dep-2",
            "permission_code": "deployment:read",
        },
        {
            "type": "user",
            "kc_user_sub": "user-1",
            "resource_type": "deployment",
            "resource_external_id": "dep-1",
            "permission_code": "deployment:run",
        },
        {
            "type": "user",
            "kc_user_sub": "user-2",
            "resource_type": "deployment",
            "resource_external_id": "dep-2",
            "permission_code": "deployment:run",
        },
    ]

    with (
        patch(
            "api.routers.auth_routes.resource_permission_service.list_all_permissions",
            new_callable=AsyncMock,
            return_value=all_permissions,
        ),
        patch(
            "api.routers.auth_routes.list_users",
            new_callable=AsyncMock,
            return_value=[{"id": "user-1"}],
        ) as mock_list_users,
    ):
        response = await test_client.get("/admin/permissions")

    assert response.status_code == 200
    payload = response.json()
    assert payload == [
        all_permissions[0],
        all_permissions[2],
    ]
    mock_list_users.assert_awaited_once_with(_GROUP_ADMIN)


async def test_assign_group_resource_permissions_forbidden_out_of_scope(test_client: AsyncClient):
    with patch(
        "api.routers.auth_routes.resource_permission_service.assign_group_resource_permissions",
        new_callable=AsyncMock,
    ) as mock_assign:
        response = await test_client.post(
            "/admin/groups/group-2/resource-permissions",
            json={
                "resource_type": "deployment",
                "resource_external_ids": ["dep-1"],
                "permission_codes": ["deployment:read"],
            },
        )

    assert response.status_code == 403
    mock_assign.assert_not_awaited()


async def test_assign_group_resource_permissions_allowed_in_scope(test_client: AsyncClient):
    with patch(
        "api.routers.auth_routes.resource_permission_service.assign_group_resource_permissions",
        new_callable=AsyncMock,
        return_value=[],
    ) as mock_assign:
        response = await test_client.post(
            "/admin/groups/group-1/resource-permissions",
            json={
                "resource_type": "deployment",
                "resource_external_ids": ["dep-1"],
                "permission_codes": ["deployment:read"],
            },
        )

    assert response.status_code == 200
    mock_assign.assert_awaited_once()


async def test_assign_user_resource_permissions_forbidden_out_of_scope(test_client: AsyncClient):
    with (
        patch(
            "api.routers.auth_routes._ensure_user_in_scope",
            new_callable=AsyncMock,
            side_effect=HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Group admin scope exceeded",
            ),
        ) as mock_scope,
        patch(
            "api.routers.auth_routes.resource_permission_service.assign_user_resource_permissions",
            new_callable=AsyncMock,
        ) as mock_assign,
    ):
        response = await test_client.post(
            "/admin/users/user-2/resource-permissions",
            json={
                "resource_type": "deployment",
                "resource_external_ids": ["dep-1"],
                "permission_codes": ["deployment:run"],
            },
        )

    assert response.status_code == 403
    mock_scope.assert_awaited_once_with(_GROUP_ADMIN, "user-2")
    mock_assign.assert_not_awaited()


async def test_assign_user_resource_permissions_allowed_in_scope(test_client: AsyncClient):
    with (
        patch(
            "api.routers.auth_routes._ensure_user_in_scope",
            new_callable=AsyncMock,
            return_value=None,
        ) as mock_scope,
        patch(
            "api.routers.auth_routes.resource_permission_service.assign_user_resource_permissions",
            new_callable=AsyncMock,
            return_value=[],
        ) as mock_assign,
    ):
        response = await test_client.post(
            "/admin/users/user-1/resource-permissions",
            json={
                "resource_type": "deployment",
                "resource_external_ids": ["dep-1"],
                "permission_codes": ["deployment:run"],
            },
        )

    assert response.status_code == 200
    mock_scope.assert_awaited_once_with(_GROUP_ADMIN, "user-1")
    mock_assign.assert_awaited_once()
