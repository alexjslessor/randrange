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


async def test_permission_matrix_server_sort_and_pagination(test_client: AsyncClient):
    assign_group_resp = await test_client.post(
        "/admin/groups/group-1/resource-permissions",
        json={
            "resource_type": "deployment",
            "resource_external_ids": ["dep-a"],
            "permission_codes": ["deployment:read"],
            "resource_names": {"dep-a": "Deploy A"},
        },
    )
    assert assign_group_resp.status_code == 200

    assign_user_dep_a_resp = await test_client.post(
        "/admin/users/user-1/resource-permissions",
        json={
            "resource_type": "deployment",
            "resource_external_ids": ["dep-a"],
            "permission_codes": ["deployment:edit"],
            "resource_names": {"dep-a": "Deploy A"},
        },
    )
    assert assign_user_dep_a_resp.status_code == 200

    assign_user_dep_b_resp = await test_client.post(
        "/admin/users/user-1/resource-permissions",
        json={
            "resource_type": "deployment",
            "resource_external_ids": ["dep-b"],
            "permission_codes": ["deployment:run"],
            "resource_names": {"dep-b": "Deploy B"},
        },
    )
    assert assign_user_dep_b_resp.status_code == 200

    mocked_users = [
        {"id": "user-1", "username": "alice", "group_ids": ["group-1"]},
        {"id": "user-2", "username": "bob", "group_ids": []},
        {"id": "user-3", "username": "carol", "group_ids": ["group-2"]},
    ]
    mocked_groups = [
        {"id": "group-1", "name": "Admins"},
        {"id": "group-2", "name": "Viewers"},
    ]

    with (
        patch(
            "api.routers.auth_routes.list_users",
            new_callable=AsyncMock,
            return_value=mocked_users,
        ),
        patch(
            "api.routers.auth_routes.list_groups",
            new_callable=AsyncMock,
            return_value=mocked_groups,
        ),
    ):
        page_one_resp = await test_client.get(
            "/admin/permission-matrix",
            params={
                "page": 1,
                "page_size": 2,
                "sort_by": "username",
                "sort_dir": "asc",
            },
        )
        page_two_resp = await test_client.get(
            "/admin/permission-matrix",
            params={
                "page": 2,
                "page_size": 2,
                "sort_by": "username",
                "sort_dir": "asc",
            },
        )
        descending_resp = await test_client.get(
            "/admin/permission-matrix",
            params={
                "page": 1,
                "page_size": 1,
                "sort_by": "username",
                "sort_dir": "desc",
            },
        )

    assert page_one_resp.status_code == 200
    page_one_payload = page_one_resp.json()
    assert page_one_payload["total"] == 4
    assert page_one_payload["total_pages"] == 2
    assert len(page_one_payload["rows"]) == 2
    assert [row["username"] for row in page_one_payload["rows"]] == ["alice", "alice"]
    assert page_one_payload["rows"][0]["source"] == "Group + Direct"
    assert page_one_payload["rows"][0]["deployment_name"] == "Deploy A"
    assert page_one_payload["rows"][0]["effective_permissions"] == [
        "deployment:edit",
        "deployment:read",
    ]

    assert page_two_resp.status_code == 200
    page_two_payload = page_two_resp.json()
    assert [row["username"] for row in page_two_payload["rows"]] == ["bob", "carol"]
    assert page_two_payload["rows"][0]["group_name"] == "(No Group)"
    assert page_two_payload["rows"][0]["source"] == "None"
    assert page_two_payload["rows"][1]["group_name"] == "Viewers"
    assert page_two_payload["rows"][1]["source"] == "None"

    assert descending_resp.status_code == 200
    descending_payload = descending_resp.json()
    assert descending_payload["rows"][0]["username"] == "carol"
