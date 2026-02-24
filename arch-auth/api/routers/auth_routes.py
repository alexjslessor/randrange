from __future__ import annotations

import asyncio
import logging
import logging.config
import httpx
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.deps import (
    Principal,
    get_current_principal,
    require_superuser,
    require_superuser_or_group_admin,
)
from api.auth.service import resource_permission_service
from api.db import get_db
from api.email_client import EmailClient
from api.logs import LOGGING_CONFIG
from api.models import (
    GroupResourcePermissionView,
    ResourcePermissionAssignRequest,
    TokenResponse,
    UserProfile,
    UserRegisterRequest,
    UserResourcePermissionView,
    PermissionMatrixPage,
)
from api.settings import get_settings

settings = get_settings()
router = APIRouter()
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger("uvicorn")
ADMIN_GROUP_IDS_ATTRIBUTE = "admin_group_ids"
_admin_group_user_profile_ready = False
_admin_group_user_profile_lock = asyncio.Lock()

class AssignUserToGroupRequest(BaseModel):
    user_id: str
    is_group_admin: bool = False

class UpdateGroupMemberRequest(BaseModel):
    is_group_admin: bool


def _bad_request(msg: str):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


async def _send_signup_notification_email(payload: UserRegisterRequest, user_id: str) -> None:
    if not settings.SIGNUP_NOTIFICATION_ENABLED:
        return

    full_name = " ".join(
        part.strip()
        for part in [payload.first_name or "", payload.last_name or ""]
        if part and part.strip()
    )
    subject = "New user has signed up"
    body = (
        "A new user has signed up.\n\n"
        f"User ID: {user_id}\n"
        f"Username: {payload.username}\n"
        f"Email: {payload.email}\n"
        f"Full name: {full_name or '(not provided)'}\n"
    )

    email_client = EmailClient(
        host=settings.SIGNUP_NOTIFICATION_SMTP_HOST,
        port=settings.SIGNUP_NOTIFICATION_SMTP_PORT,
        sender=settings.SIGNUP_NOTIFICATION_FROM_EMAIL,
    )
    try:
        await asyncio.to_thread(
            email_client.send_signup_email,
            settings.SIGNUP_NOTIFICATION_TO_EMAIL,
            subject,
            body,
        )
    except Exception:
        logger.exception(
            "Failed to send signup notification email for user '%s'",
            payload.username,
        )
    finally:
        await asyncio.to_thread(email_client.close)


async def _kc_admin_token() -> str:
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


def _normalize_admin_group_ids(raw_value: object) -> list[str]:
    if raw_value is None:
        return []

    if isinstance(raw_value, str):
        split_values = raw_value.split(",") if "," in raw_value else [raw_value]
        candidate_values = [value.strip() for value in split_values]
    elif isinstance(raw_value, (list, tuple, set)):
        candidate_values = [str(value).strip() for value in raw_value]
    else:
        candidate_values = [str(raw_value).strip()]

    normalized_values = [value for value in candidate_values if value]
    return list(dict.fromkeys(normalized_values))


def _extract_admin_group_ids(user_repr: dict) -> list[str]:
    attributes = user_repr.get("attributes")
    if not isinstance(attributes, dict):
        return []
    return _normalize_admin_group_ids(attributes.get(ADMIN_GROUP_IDS_ATTRIBUTE))


def _extract_group_description(group_repr: dict) -> str:
    attributes = group_repr.get("attributes")
    if not isinstance(attributes, dict):
        return ""
    raw_description = attributes.get("description")
    if isinstance(raw_description, str):
        return raw_description.strip()
    if isinstance(raw_description, list):
        for value in raw_description:
            if isinstance(value, str) and value.strip():
                return value.strip()
    return ""


def _principal_admin_group_scope(principal: Principal) -> set[str]:
    return {
        group_id
        for group_id in (
            str(raw_group_id).strip()
            for raw_group_id in (principal.admin_group_ids or [])
        )
        if group_id
    }


def _group_in_scope(principal: Principal, group_id: str) -> bool:
    if principal.is_superuser:
        return True
    if not principal.is_group_admin:
        return False
    return group_id in _principal_admin_group_scope(principal)


def _user_in_scope(principal: Principal, user_group_ids: list[str]) -> bool:
    if principal.is_superuser:
        return True
    if not principal.is_group_admin:
        return False
    admin_group_scope = _principal_admin_group_scope(principal)
    if not admin_group_scope:
        return False
    return bool(admin_group_scope.intersection(user_group_ids))


def _ensure_group_in_scope(principal: Principal, group_id: str) -> None:
    if _group_in_scope(principal, group_id):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Group admin scope exceeded",
    )


async def _fetch_user_group_ids(
    *,
    client: httpx.AsyncClient,
    admin_token: str,
    user_id: str,
) -> list[str]:
    groups_resp = await client.get(
        f"{settings.kc_admin_url}/users/{user_id}/groups",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    if not groups_resp.is_success:
        raise HTTPException(status_code=groups_resp.status_code, detail=groups_resp.text)

    payload = groups_resp.json()
    if not isinstance(payload, list):
        return []
    group_ids = [
        group_id
        for group_id in (
            str(group.get("id") or "").strip()
            for group in payload
            if isinstance(group, dict)
        )
        if group_id
    ]
    return list(dict.fromkeys(group_ids))


async def _ensure_user_in_scope(principal: Principal, user_id: str) -> None:
    if principal.is_superuser:
        return

    admin_group_scope = _principal_admin_group_scope(principal)
    if not admin_group_scope:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Group admin scope exceeded",
        )

    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        user_group_ids = await _fetch_user_group_ids(
            client=client,
            admin_token=admin_token,
            user_id=user_id,
        )

    if not _user_in_scope(principal, user_group_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Group admin scope exceeded",
        )


async def _list_permissions_for_principal(
    *,
    principal: Principal,
    db: AsyncSession,
    scoped_users: list[dict] | None = None,
) -> list[dict]:
    permissions = await resource_permission_service.list_all_permissions(db)
    if principal.is_superuser:
        return permissions

    admin_group_scope = _principal_admin_group_scope(principal)
    if not admin_group_scope:
        return []

    if scoped_users is None:
        scoped_users = await list_users(principal)

    scoped_user_ids = {
        user_id
        for user_id in (
            str(user.get("id") or "").strip()
            for user in scoped_users
            if isinstance(user, dict)
        )
        if user_id
    }

    filtered_permissions: list[dict] = []
    for permission in permissions:
        if not isinstance(permission, dict):
            continue

        permission_type = str(permission.get("type") or "").strip()
        if permission_type == "group":
            group_id = str(permission.get("kc_group_id") or "").strip()
            if group_id in admin_group_scope:
                filtered_permissions.append(permission)
            continue

        if permission_type == "user":
            user_id = str(permission.get("kc_user_sub") or "").strip()
            if user_id in scoped_user_ids:
                filtered_permissions.append(permission)
    return filtered_permissions


async def _ensure_admin_group_profile_attribute(
    *,
    client: httpx.AsyncClient,
    admin_token: str,
) -> None:
    global _admin_group_user_profile_ready
    if _admin_group_user_profile_ready:
        return

    async with _admin_group_user_profile_lock:
        if _admin_group_user_profile_ready:
            return

        headers = {"Authorization": f"Bearer {admin_token}"}
        profile_resp = await client.get(
            f"{settings.kc_admin_url}/users/profile",
            headers=headers,
        )
        if not profile_resp.is_success:
            raise HTTPException(status_code=profile_resp.status_code, detail=profile_resp.text)

        profile_payload = profile_resp.json()
        if not isinstance(profile_payload, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unexpected Keycloak user profile response",
            )

        attributes = profile_payload.get("attributes")
        if not isinstance(attributes, list):
            attributes = []

        already_present = any(
            isinstance(attribute, dict) and attribute.get("name") == ADMIN_GROUP_IDS_ATTRIBUTE
            for attribute in attributes
        )
        if already_present:
            _admin_group_user_profile_ready = True
            return

        attributes.append(
            {
                "name": ADMIN_GROUP_IDS_ATTRIBUTE,
                "displayName": "Admin Group IDs",
                "permissions": {
                    "view": ["admin"],
                    "edit": ["admin"],
                },
                "multivalued": True,
            }
        )
        profile_payload["attributes"] = attributes

        update_profile_resp = await client.put(
            f"{settings.kc_admin_url}/users/profile",
            json=profile_payload,
            headers=headers,
        )
        if not update_profile_resp.is_success:
            raise HTTPException(
                status_code=update_profile_resp.status_code,
                detail=update_profile_resp.text,
            )
        _admin_group_user_profile_ready = True


async def _sync_user_admin_group_membership(
    *,
    client: httpx.AsyncClient,
    admin_token: str,
    user_id: str,
    group_id: str,
    is_group_admin: bool,
) -> None:
    await _ensure_admin_group_profile_attribute(
        client=client,
        admin_token=admin_token,
    )

    user_resp = await client.get(
        f"{settings.kc_admin_url}/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    if not user_resp.is_success:
        raise HTTPException(status_code=user_resp.status_code, detail=user_resp.text)

    user_repr = user_resp.json()
    attributes = user_repr.get("attributes")
    if not isinstance(attributes, dict):
        attributes = {}

    admin_group_id_set = set(_normalize_admin_group_ids(attributes.get(ADMIN_GROUP_IDS_ATTRIBUTE)))
    if is_group_admin:
        admin_group_id_set.add(group_id)
    else:
        admin_group_id_set.discard(group_id)

    if admin_group_id_set:
        attributes[ADMIN_GROUP_IDS_ATTRIBUTE] = sorted(admin_group_id_set)
    else:
        attributes.pop(ADMIN_GROUP_IDS_ATTRIBUTE, None)

    # Keycloak user update for attributes is reliable when mutable profile fields
    # are included alongside attributes rather than sending attributes alone.
    update_payload = {
        "username": user_repr.get("username"),
        "email": user_repr.get("email"),
        "firstName": user_repr.get("firstName"),
        "lastName": user_repr.get("lastName"),
        "enabled": bool(user_repr.get("enabled", True)),
        "emailVerified": bool(user_repr.get("emailVerified", False)),
        "attributes": attributes,
        "requiredActions": user_repr.get("requiredActions", []),
    }
    update_resp = await client.put(
        f"{settings.kc_admin_url}/users/{user_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    if not update_resp.is_success:
        raise HTTPException(status_code=update_resp.status_code, detail=update_resp.text)
    return update_resp

# ---------------------------------------------------------------------------
# Auth proxy endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/login", 
    response_model=TokenResponse,
)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    """Proxy username/password login to Keycloak token endpoint."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            settings.kc_token_url,
            data={
                "grant_type": "password",
                "client_id": settings.KC_CLIENT_ID,
                "username": form_data.username,
                "password": form_data.password,
                "scope": "openid profile email",
            },
        )
    if resp.status_code == 401:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not resp.is_success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=resp.text)

    data = resp.json()
    return TokenResponse(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token", ""),
        token_type=data.get("token_type", "bearer"),
        expires_in=data.get("expires_in", 3600),
        scope=data.get("scope", ""),
    )


@router.post(
    "/refresh", 
    response_model=TokenResponse,
)
async def refresh_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Proxy refresh token exchange to Keycloak."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            settings.kc_token_url,
            data={
                "grant_type": "refresh_token",
                "client_id": settings.KC_CLIENT_ID,
                "refresh_token": form_data.password,  # passed in password field
            },
        )
    if not resp.is_success:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    data = resp.json()
    return TokenResponse(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token", ""),
        token_type=data.get("token_type", "bearer"),
        expires_in=data.get("expires_in", 3600),
        scope=data.get("scope", ""),
    )


@router.post(
    "/register", 
    response_model=UserProfile, 
    status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterRequest):
    """Create a user in Keycloak via Admin REST API."""
    admin_token = await _kc_admin_token()
    username = payload.username.strip()
    email = (payload.email or "").strip() or username
    user_body = {
        "username": username,
        "email": email,
        "firstName": payload.first_name or "",
        "lastName": payload.last_name or "",
        "enabled": True,
        "emailVerified": True,
        "requiredActions": [],
        "credentials": [{"type": "password", "value": payload.password, "temporary": False}],
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.kc_admin_url}/users",
            json=user_body,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if resp.status_code == 409:
        _bad_request("Username or email already exists")
    if not resp.is_success:
        _bad_request(f"Registration failed: {resp.text}")

    # Fetch the created user to return profile
    location = resp.headers.get("Location", "")
    user_id = location.rstrip("/").split("/")[-1]
    await _send_signup_notification_email(payload, user_id)
    return UserProfile(
        id=user_id,
        username=username,
        email=email,
        groups=[],
        permissions=[],
        is_superuser=False,
        is_group_admin=False,
    )


@router.get(
    "/users/me", 
    response_model=UserProfile)
async def get_me(principal: Principal = Depends(get_current_principal)):
    """Return the current user's profile derived from the KC token."""
    return UserProfile(
        id=principal.user_id,
        username=principal.username,
        email=principal.email,
        groups=principal.groups,
        permissions=principal.permissions,
        is_superuser=principal.is_superuser,
        is_group_admin=principal.is_group_admin,
        admin_group_ids=principal.admin_group_ids,
    )


# ---------------------------------------------------------------------------
# Admin: KC group management (thin proxy)
# ---------------------------------------------------------------------------

@router.get(
    "/admin/realms",
)
async def list_realms(_: Principal = Depends(require_superuser_or_group_admin)):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.KC_URL}/admin/realms",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    resp.raise_for_status()
    return [
        {
            "id": r.get("realm", r["id"]),
            "slug": r.get("realm", r["id"]),
            "name": r.get("displayName") or r.get("realm", r["id"]),
            "is_active": r.get("enabled", True),
        }
        for r in resp.json()
    ]


@router.post(
    "/admin/realms", 
    status_code=status.HTTP_201_CREATED)
async def create_realm(
    payload: dict,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    slug = payload.get("slug") or ""
    name = payload.get("name") or slug
    realm_body = {
        "realm": slug,
        "displayName": name,
        "enabled": True,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.KC_URL}/admin/realms",
            json=realm_body,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"id": slug, "slug": slug, "name": name}


@router.get(
    "/admin/oauth-clients",
)
async def list_oauth_clients(
    realm_id: str | None = Query(default=None),
    _: Principal = Depends(require_superuser_or_group_admin),
):
    admin_token = await _kc_admin_token()
    realm = realm_id or settings.KC_REALM
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.KC_URL}/admin/realms/{realm}/clients",
            params={"max": 200},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    resp.raise_for_status()
    return [
        {
            "id": c["id"],
            "client_id": c.get("clientId", ""),
            "realm_id": realm,
            "is_confidential": c.get("publicClient") is False,
            "scopes": [],
            "redirect_uris": c.get("redirectUris", []),
            "created_at": None,
        }
        for c in resp.json()
    ]


@router.post(
    "/admin/oauth-clients", 
    status_code=status.HTTP_201_CREATED,
)
async def create_oauth_client(
    payload: dict,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    realm = payload.get("realm_id") or settings.KC_REALM
    client_body = {
        "clientId": payload.get("client_id"),
        "redirectUris": payload.get("redirect_uris", []),
        "publicClient": True,
        "enabled": True,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.KC_URL}/admin/realms/{realm}/clients",
            json=client_body,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return {
        "client_id": payload.get("client_id"), 
        "realm_id": realm,
    }


@router.get(
    "/admin/permissions",
)
async def list_permissions(
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    return await _list_permissions_for_principal(principal=principal, db=db)


@router.post(
    "/admin/groups/{group_id}/permissions", 
    status_code=status.HTTP_204_NO_CONTENT)
async def assign_group_permissions(
    group_id: str,
    payload: dict,
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Legacy endpoint: stores permission codes as resource permissions scoped to a client."""
    _ensure_group_in_scope(principal, group_id)
    permission_codes = payload.get("permission_codes") or []
    client_id = payload.get("client_id") or ""
    if not permission_codes or not client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="client_id and permission_codes required")
    await resource_permission_service.assign_group_resource_permissions(
        db,
        kc_group_id=group_id,
        resource_type="client",
        resource_external_ids=[client_id],
        permission_codes=permission_codes,
        resource_names={client_id: client_id},
    )


@router.get("/admin/groups")
async def list_groups(principal: Principal = Depends(require_superuser_or_group_admin)):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.kc_admin_url}/groups",
            params={"max": 500},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    resp.raise_for_status()
    groups = [
        {
            "id": g["id"],
            "name": g.get("name", ""),
            "realm_id": settings.KC_REALM,
            "description": _extract_group_description(g),
            "permissions": [],
            "is_active": True,
            "created_at": None,
        }
        for g in resp.json()
    ]
    if principal.is_superuser:
        return groups
    return [
        group
        for group in groups
        if _group_in_scope(principal, str(group.get("id") or "").strip())
    ]


@router.get("/admin/users")
async def list_users(principal: Principal = Depends(require_superuser_or_group_admin)):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        users_resp = await client.get(
            f"{settings.kc_admin_url}/users",
            params={"max": 500, "briefRepresentation": "false"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    users_resp.raise_for_status()
    kc_users = users_resp.json()

    # Fetch group membership for each user in parallel
    async with httpx.AsyncClient() as client:
        group_resps = await asyncio.gather(
            *[
                client.get(
                    f"{settings.kc_admin_url}/users/{u['id']}/groups",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                for u in kc_users
            ],
            return_exceptions=True,
        )
        user_detail_resps = await asyncio.gather(
            *[
                client.get(
                    f"{settings.kc_admin_url}/users/{u['id']}",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                for u in kc_users
            ],
            return_exceptions=True,
        )

    result = []
    for u, gr, user_detail_resp in zip(kc_users, group_resps, user_detail_resps):
        kc_groups = gr.json() if not isinstance(gr, Exception) and gr.is_success else []
        user_repr = (
            user_detail_resp.json()
            if not isinstance(user_detail_resp, Exception) and user_detail_resp.is_success
            else u
        )
        user_group_ids = [g["id"] for g in kc_groups]
        if not _user_in_scope(principal, user_group_ids):
            continue
        user_admin_group_ids = [
            group_id
            for group_id in _extract_admin_group_ids(user_repr)
            if group_id in user_group_ids
        ]
        result.append({
            "id": u["id"],
            "username": u.get("username", ""),
            "email": u.get("email", ""),
            "is_active": u.get("enabled", True),
            "is_superuser": False,
            "is_group_admin": bool(user_admin_group_ids),
            "realm_id": settings.KC_REALM,
            "group_ids": user_group_ids,
            "groups": [g["name"] for g in kc_groups],
            "admin_group_ids": user_admin_group_ids,
            "permissions": [],
            "created_at": None,
        })
    return result


def _normalize_permission_codes(raw_values: object) -> list[str]:
    if not isinstance(raw_values, (list, tuple, set)):
        return []
    normalized_values: list[str] = []
    for value in raw_values:
        text_value = str(value).strip()
        if text_value:
            normalized_values.append(text_value)
    return sorted(set(normalized_values))


def _build_permission_matrix_rows(
    users: list[dict],
    group_label_by_id: dict[str, str],
    deployment_label_by_id: dict[str, str],
    group_permission_map_by_group: dict[str, dict[str, set[str]]],
    user_permission_map_by_user: dict[str, dict[str, set[str]]],
) -> list[dict]:
    rows: list[dict] = []
    for user in users:
        user_id = str(user.get("id") or "").strip()
        if not user_id:
            continue

        username = str(user.get("username") or user_id)
        user_group_ids = list(
            dict.fromkeys(
                str(group_id).strip()
                for group_id in (user.get("group_ids") or [])
                if str(group_id).strip()
            )
        )
        direct_permission_map = user_permission_map_by_user.get(user_id, {})
        aggregate_group_permission_map: dict[str, set[str]] = {}

        for group_id in user_group_ids:
            group_permission_map = group_permission_map_by_group.get(group_id, {})
            for deployment_id, permission_codes in group_permission_map.items():
                normalized_permission_codes = _normalize_permission_codes(permission_codes)
                if not normalized_permission_codes:
                    continue
                existing_codes = aggregate_group_permission_map.setdefault(deployment_id, set())
                existing_codes.update(normalized_permission_codes)

        if len(user_group_ids) == 0:
            direct_deployment_ids = sorted(
                direct_permission_map.keys(),
                key=lambda deployment_id: (
                    str(deployment_label_by_id.get(deployment_id, deployment_id)).casefold(),
                    str(deployment_id).casefold(),
                ),
            )
            has_no_group_row = False
            for deployment_id in direct_deployment_ids:
                direct_permissions = _normalize_permission_codes(
                    direct_permission_map.get(deployment_id, [])
                )
                if not direct_permissions:
                    continue
                has_no_group_row = True
                rows.append(
                    {
                        "id": f"no-group:{user_id}:{deployment_id}",
                        "group_id": "",
                        "group_name": "(No Group)",
                        "user_id": user_id,
                        "username": username,
                        "deployment_id": deployment_id,
                        "deployment_name": deployment_label_by_id.get(
                            deployment_id, deployment_id
                        ),
                        "group_permissions": [],
                        "direct_user_permissions": direct_permissions,
                        "effective_permissions": direct_permissions,
                        "source": "Direct",
                    }
                )
            if not has_no_group_row:
                rows.append(
                    {
                        "id": f"no-group:{user_id}:none",
                        "group_id": "",
                        "group_name": "(No Group)",
                        "user_id": user_id,
                        "username": username,
                        "deployment_id": "",
                        "deployment_name": "(No Deployment)",
                        "group_permissions": [],
                        "direct_user_permissions": [],
                        "effective_permissions": [],
                        "source": "None",
                    }
                )
            continue

        for group_id in user_group_ids:
            group_permission_map = group_permission_map_by_group.get(group_id, {})
            group_name = group_label_by_id.get(group_id, group_id)
            deployment_ids = sorted(
                set(group_permission_map.keys()).union(direct_permission_map.keys()),
                key=lambda deployment_id: (
                    str(deployment_label_by_id.get(deployment_id, deployment_id)).casefold(),
                    str(deployment_id).casefold(),
                ),
            )
            has_group_row = False

            for deployment_id in deployment_ids:
                group_permissions = _normalize_permission_codes(
                    group_permission_map.get(deployment_id, [])
                )
                direct_permissions = _normalize_permission_codes(
                    direct_permission_map.get(deployment_id, [])
                )
                effective_permissions = _normalize_permission_codes(
                    list(aggregate_group_permission_map.get(deployment_id, set()))
                    + direct_permissions
                )
                if not effective_permissions:
                    continue

                has_group_permissions = bool(
                    aggregate_group_permission_map.get(deployment_id, set())
                )
                has_direct_permissions = len(direct_permissions) > 0
                has_group_row = True

                rows.append(
                    {
                        "id": f"{group_id}:{user_id}:{deployment_id}",
                        "group_id": group_id,
                        "group_name": group_name,
                        "user_id": user_id,
                        "username": username,
                        "deployment_id": deployment_id,
                        "deployment_name": deployment_label_by_id.get(
                            deployment_id, deployment_id
                        ),
                        "group_permissions": group_permissions,
                        "direct_user_permissions": direct_permissions,
                        "effective_permissions": effective_permissions,
                        "source": (
                            "Group + Direct"
                            if has_group_permissions and has_direct_permissions
                            else "Direct"
                            if has_direct_permissions
                            else "Group"
                        ),
                    }
                )

            if not has_group_row:
                rows.append(
                    {
                        "id": f"{group_id}:{user_id}:none",
                        "group_id": group_id,
                        "group_name": group_name,
                        "user_id": user_id,
                        "username": username,
                        "deployment_id": "",
                        "deployment_name": "(No Deployment)",
                        "group_permissions": [],
                        "direct_user_permissions": [],
                        "effective_permissions": [],
                        "source": "None",
                    }
                )

    return rows


@router.get(
    "/admin/permission-matrix",
    response_model=PermissionMatrixPage,
)
async def list_permission_matrix(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
    sort_by: Literal["group_name", "username", "deployment_name"] = Query(
        default="group_name"
    ),
    sort_dir: Literal["asc", "desc"] = Query(default="asc"),
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    users = await list_users(principal)
    groups = await list_groups(principal)

    group_label_by_id = {
        str(group.get("id")): str(group.get("name") or group.get("id"))
        for group in groups
        if group.get("id")
    }

    permissions = await _list_permissions_for_principal(
        principal=principal,
        db=db,
        scoped_users=users,
    )
    deployment_label_by_id: dict[str, str] = {}
    group_permission_map_by_group: dict[str, dict[str, set[str]]] = {}
    user_permission_map_by_user: dict[str, dict[str, set[str]]] = {}

    for permission in permissions:
        if not isinstance(permission, dict):
            continue
        if str(permission.get("resource_type") or "") != "deployment":
            continue

        deployment_id = str(permission.get("resource_external_id") or "").strip()
        permission_code = str(permission.get("permission_code") or "").strip()
        if not deployment_id or not permission_code:
            continue

        deployment_name = str(permission.get("resource_name") or "").strip()
        if deployment_name:
            deployment_label_by_id[deployment_id] = deployment_name

        if permission.get("type") == "group":
            group_id = str(permission.get("kc_group_id") or "").strip()
            if not group_id:
                continue
            group_permission_map = group_permission_map_by_group.setdefault(group_id, {})
            deployment_permissions = group_permission_map.setdefault(deployment_id, set())
            deployment_permissions.add(permission_code)
            continue

        user_id = str(permission.get("kc_user_sub") or "").strip()
        if not user_id:
            continue
        user_permission_map = user_permission_map_by_user.setdefault(user_id, {})
        deployment_permissions = user_permission_map.setdefault(deployment_id, set())
        deployment_permissions.add(permission_code)

    rows = _build_permission_matrix_rows(
        users=users,
        group_label_by_id=group_label_by_id,
        deployment_label_by_id=deployment_label_by_id,
        group_permission_map_by_group=group_permission_map_by_group,
        user_permission_map_by_user=user_permission_map_by_user,
    )

    def sort_key(row: dict) -> tuple[str, str, str, str, str]:
        return (
            str(row.get(sort_by) or "").casefold(),
            str(row.get("group_name") or "").casefold(),
            str(row.get("username") or "").casefold(),
            str(row.get("deployment_name") or "").casefold(),
            str(row.get("id") or "").casefold(),
        )

    rows.sort(key=sort_key)
    if sort_dir == "desc":
        rows.reverse()

    total = len(rows)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    paged_rows = rows[start_index:end_index] if start_index < total else []

    return {
        "rows": paged_rows,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "sort_by": sort_by,
        "sort_dir": sort_dir,
    }


@router.patch(
    "/admin/groups/{group_id}/users/{user_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
)
async def update_group_member(
    group_id: str,
    user_id: str,
    payload: UpdateGroupMemberRequest,
    principal: Principal = Depends(require_superuser_or_group_admin),
):
    _ensure_group_in_scope(principal, group_id)
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        await _sync_user_admin_group_membership(
            client=client,
            admin_token=admin_token,
            user_id=user_id,
            group_id=group_id,
            is_group_admin=payload.is_group_admin,
        )


@router.post(
    "/admin/groups/{group_id}/users", 
    status_code=status.HTTP_204_NO_CONTENT)
async def assign_user_to_group(
    group_id: str,
    payload: AssignUserToGroupRequest,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{settings.kc_admin_url}/users/{payload.user_id}/groups/{group_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        if resp.is_success:
            await _sync_user_admin_group_membership(
                client=client,
                admin_token=admin_token,
                user_id=payload.user_id,
                group_id=group_id,
                is_group_admin=payload.is_group_admin,
            )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)


@router.post(
    "/admin/users", 
    status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: dict,
    _: Principal = Depends(require_superuser),
):
    """sets user as  "emailVerified": True same as 
    login page.
    code should be refactored to reduce duplication.
    """
    admin_token = await _kc_admin_token()
    username = str(payload.get("username") or "").strip()
    email = str(payload.get("email") or "").strip() or username
    user_body = {
        "username": username,
        "email": email,
        "firstName": str(payload.get("first_name") or "").strip(),
        "lastName": str(payload.get("last_name") or "").strip(),
        "enabled": True,
        "emailVerified": True,
        "requiredActions": [],
        "credentials": [{"type": "password", "value": payload.get("password", ""), "temporary": False}],
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.kc_admin_url}/users",
            json=user_body,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if resp.status_code == 409:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    user_id = resp.headers.get("Location", "").rstrip("/").split("/")[-1]
    if payload.get("group_id") and user_id:
        async with httpx.AsyncClient() as client:
            group_assign_resp = await client.put(
                f"{settings.kc_admin_url}/users/{user_id}/groups/{payload['group_id']}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            if not group_assign_resp.is_success:
                raise HTTPException(status_code=group_assign_resp.status_code, detail=group_assign_resp.text)
            await _sync_user_admin_group_membership(
                client=client,
                admin_token=admin_token,
                user_id=user_id,
                group_id=payload["group_id"],
                is_group_admin=bool(payload.get("group_is_admin", False)),
            )
    return {
        "id": user_id, 
        "username": payload.get("username"),
    }


@router.delete(
    "/admin/users/{user_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: str,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{settings.kc_admin_url}/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)


@router.patch(
    "/admin/users/{user_id}/disable", 
    status_code=status.HTTP_204_NO_CONTENT,
)
async def disable_user(
    user_id: str,
    payload: dict,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{settings.kc_admin_url}/users/{user_id}",
            json={"enabled": bool(payload.get("is_active", True))},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)


@router.post(
    "/admin/groups", 
    status_code=status.HTTP_201_CREATED,
)
async def create_group(
    payload: dict,
    _: Principal = Depends(require_superuser),
):
    name = str(payload.get("name") or "").strip()
    description = str(payload.get("description") or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group name is required")

    group_body: dict = {"name": name}
    if description:
        group_body["attributes"] = {"description": [description]}

    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.kc_admin_url}/groups",
            json=group_body,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if not resp.is_success:
        raise HTTPException(
            status_code=resp.status_code, 
            detail=resp.text)

    group_id = resp.headers.get("Location", "").rstrip("/").split("/")[-1]
    return {
        "id": group_id,
        "name": name,
        "realm_id": settings.KC_REALM,
        "description": description,
        "permissions": [],
        "is_active": True,
        "created_at": None,
    }


@router.patch(
    "/admin/groups/{group_id}",
)
async def update_group(
    group_id: str,
    payload: dict,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with httpx.AsyncClient() as client:
        current_resp = await client.get(
            f"{settings.kc_admin_url}/groups/{group_id}",
            headers=headers,
        )
        if not current_resp.is_success:
            raise HTTPException(status_code=current_resp.status_code, detail=current_resp.text)

        current_payload = current_resp.json()
        current_group = current_payload if isinstance(current_payload, dict) else {}
        next_name = str(payload.get("name") or current_group.get("name") or "").strip()
        if not next_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group name is required")

        attributes = current_group.get("attributes")
        if not isinstance(attributes, dict):
            attributes = {}

        if "description" in payload:
            raw_description = payload.get("description")
            if raw_description is None:
                attributes.pop("description", None)
            else:
                next_description = str(raw_description).strip()
                if next_description:
                    attributes["description"] = [next_description]
                else:
                    attributes.pop("description", None)

        update_payload = {
            "name": next_name,
            "attributes": attributes,
        }
        update_resp = await client.put(
            f"{settings.kc_admin_url}/groups/{group_id}",
            json=update_payload,
            headers=headers,
        )
    if not update_resp.is_success:
        raise HTTPException(status_code=update_resp.status_code, detail=update_resp.text)

    return {
        "id": group_id,
        "name": next_name,
        "realm_id": settings.KC_REALM,
        "description": _extract_group_description({"attributes": attributes}),
        "permissions": [],
        "is_active": True,
        "created_at": None,
    }


@router.delete(
    "/admin/groups/{group_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_group(
    group_id: str,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{settings.kc_admin_url}/groups/{group_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)


@router.delete(
    "/admin/groups/{group_id}/users/{user_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_user_from_group(
    group_id: str,
    user_id: str,
    _: Principal = Depends(require_superuser),
):
    admin_token = await _kc_admin_token()
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{settings.kc_admin_url}/users/{user_id}/groups/{group_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        if resp.is_success:
            await _sync_user_admin_group_membership(
                client=client,
                admin_token=admin_token,
                user_id=user_id,
                group_id=group_id,
                is_group_admin=False,
            )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)


# ---------------------------------------------------------------------------
# Resource permissions — group level
# ---------------------------------------------------------------------------

@router.get(
    "/admin/groups/{kc_group_id}/resource-permissions",
    response_model=list[GroupResourcePermissionView],
)
async def list_group_resource_permissions(
    kc_group_id: str,
    resource_type: str | None = Query(default=None),
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    _ensure_group_in_scope(principal, kc_group_id)
    return await resource_permission_service.list_group_resource_permissions(
        db, 
        kc_group_id, 
        resource_type
    )


@router.post(
    "/admin/groups/{kc_group_id}/resource-permissions",
    response_model=list[GroupResourcePermissionView],
)
async def assign_group_resource_permissions(
    kc_group_id: str,
    payload: ResourcePermissionAssignRequest,
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    _ensure_group_in_scope(principal, kc_group_id)
    return await resource_permission_service.assign_group_resource_permissions(
        db,
        kc_group_id=kc_group_id,
        resource_type=payload.resource_type,
        resource_external_ids=payload.resource_external_ids,
        permission_codes=payload.permission_codes,
        resource_names=payload.resource_names,
    )


@router.delete(
    "/admin/groups/{kc_group_id}/resource-permissions/{resource_external_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_group_resource_permission(
    kc_group_id: str,
    resource_external_id: str,
    permission_code: str = Query(...),
    resource_type: str = Query(...),
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    _ensure_group_in_scope(principal, kc_group_id)
    try:
        await resource_permission_service.remove_group_resource_permission(
            db, kc_group_id, resource_type, resource_external_id, permission_code
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Resource permissions — user level
# ---------------------------------------------------------------------------

@router.get(
    "/admin/users/{kc_user_sub}/resource-permissions",
    response_model=list[UserResourcePermissionView],
)
async def list_user_resource_permissions(
    kc_user_sub: str,
    resource_type: str | None = Query(default=None),
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_user_in_scope(principal, kc_user_sub)
    return await resource_permission_service.list_user_resource_permissions(
        db, kc_user_sub, resource_type
    )


@router.post(
    "/admin/users/{kc_user_sub}/resource-permissions",
    response_model=list[UserResourcePermissionView],
)
async def assign_user_resource_permissions(
    kc_user_sub: str,
    payload: ResourcePermissionAssignRequest,
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_user_in_scope(principal, kc_user_sub)
    return await resource_permission_service.assign_user_resource_permissions(
        db,
        kc_user_sub=kc_user_sub,
        resource_type=payload.resource_type,
        resource_external_ids=payload.resource_external_ids,
        permission_codes=payload.permission_codes,
        resource_names=payload.resource_names,
    )


@router.delete(
    "/admin/users/{kc_user_sub}/resource-permissions/{resource_external_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_user_resource_permission(
    kc_user_sub: str,
    resource_external_id: str,
    permission_code: str = Query(...),
    resource_type: str = Query(...),
    principal: Principal = Depends(require_superuser_or_group_admin),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_user_in_scope(principal, kc_user_sub)
    try:
        await resource_permission_service.remove_user_resource_permission(
            db, kc_user_sub, resource_type, resource_external_id, permission_code
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
