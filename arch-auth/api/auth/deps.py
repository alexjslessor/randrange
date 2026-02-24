from dataclasses import dataclass, field
import asyncio
import logging
import time
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from api.settings import get_settings

logger = logging.getLogger()
settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
ADMIN_GROUP_IDS_ATTRIBUTE = "admin_group_ids"

_jwks_cache: dict | None = None
_kc_admin_token_cache: str | None = None
_kc_admin_token_expiry_epoch_seconds: float = 0.0
_kc_admin_token_lock = asyncio.Lock()


async def _get_jwks() -> dict:
    """
    Fetch and cache Keycloak JWKS used to verify JWT signatures.

    This is necessary so token validation can happen locally without a network call
    on every request. Returns a dict in JWKS format, typically
    {"keys": [<jwk_object>, ...]}.
    """
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.kc_jwks_url, timeout=10)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


def _normalize_admin_group_ids(raw_value: object) -> list[str]:
    """
    Normalize Keycloak admin group IDs into a clean, unique list.

    This is necessary because Keycloak attributes can be stored as CSV strings,
    scalar values, or iterable values. Returns list[str] of non-empty, stripped
    group IDs with duplicates removed while preserving first-seen order.
    """
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
    """
    Extract normalized admin group IDs from a Keycloak user object.

    This is necessary to centralize parsing of the nested attributes payload from
    Keycloak admin responses. Returns list[str] from
    user_repr["attributes"]["admin_group_ids"], or [] when missing/invalid.
    """
    attributes = user_repr.get("attributes")
    if not isinstance(attributes, dict):
        return []
    return _normalize_admin_group_ids(attributes.get(ADMIN_GROUP_IDS_ATTRIBUTE))


async def _kc_admin_token() -> str:
    """
    Retrieve and cache a Keycloak admin bearer token.

    This is necessary for authenticated calls to Keycloak Admin APIs while
    avoiding repeated token requests. Returns the access token string. Raises
    HTTPException(502) if the token response does not include a usable
    "access_token".
    """
    global _kc_admin_token_cache
    global _kc_admin_token_expiry_epoch_seconds

    now_epoch_seconds = time.time()
    if _kc_admin_token_cache and now_epoch_seconds < _kc_admin_token_expiry_epoch_seconds:
        return _kc_admin_token_cache

    async with _kc_admin_token_lock:
        now_epoch_seconds = time.time()
        if _kc_admin_token_cache and now_epoch_seconds < _kc_admin_token_expiry_epoch_seconds:
            return _kc_admin_token_cache

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.KC_URL}/realms/master/protocol/openid-connect/token",
                data={
                    "grant_type": "password",
                    "client_id": "admin-cli",
                    "username": settings.KC_ADMIN_USERNAME,
                    "password": settings.KC_ADMIN_PASSWORD,
                },
                timeout=10,
            )
            resp.raise_for_status()
            payload = resp.json()

        access_token = payload.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to retrieve Keycloak admin token",
            )

        expires_in = int(payload.get("expires_in", 60))
        _kc_admin_token_cache = access_token
        _kc_admin_token_expiry_epoch_seconds = now_epoch_seconds + max(5, expires_in - 5)
        return _kc_admin_token_cache


async def _get_admin_group_ids_for_user(user_id: str) -> list[str]:
    """
    Resolve a user's admin group IDs from live Keycloak user attributes.

    This is necessary so authorization reflects recent membership changes even
    before new JWTs are issued. Returns list[str] parsed from a Keycloak user
    payload shaped like {"attributes": {"admin_group_ids": ...}}. Returns [] on
    transport or non-success response errors.
    """
    try:
        admin_token = await _kc_admin_token()
        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                f"{settings.kc_admin_url}/users/{user_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10,
            )
    except httpx.HTTPError:
        logger.exception("Failed to fetch Keycloak user attributes for user_id=%s", user_id)
        return []

    if not user_resp.is_success:
        logger.warning(
            "Keycloak user lookup failed for user_id=%s with status_code=%s",
            user_id,
            user_resp.status_code,
        )
        return []

    user_payload = user_resp.json()
    return _extract_admin_group_ids(user_payload if isinstance(user_payload, dict) else {})


@dataclass
class Principal:
    user_id: str          # KC sub
    username: str
    email: str | None
    groups: list[str] = field(default_factory=list)
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)
    is_superuser: bool = False
    is_group_admin: bool = False
    admin_group_ids: list[str] = field(default_factory=list)
    scope: str = ""


async def get_current_principal(
    token: str = Depends(oauth2_scheme),
) -> Principal:
    """
    Decode the current bearer token and build the request Principal.

    This is necessary as the core auth dependency used by protected routes to
    derive identity, roles, and authorization flags. Returns a Principal object
    with fields: user_id, username, email, groups, roles, permissions,
    is_superuser, is_group_admin, admin_group_ids, and scope.
    """
    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.KC_CLIENT_ID,
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    groups: list[str] = payload.get("groups", [])
    realm_roles: list[str] = payload.get("realm_access", {}).get("roles", [])
    client_roles: list[str] = (
        payload.get("resource_access", {})
        .get(settings.KC_CLIENT_ID, {})
        .get("roles", [])
    )
    all_roles = list(set(realm_roles + client_roles))
    is_superuser = "superuser" in all_roles or "admin" in realm_roles
    admin_group_ids = await _get_admin_group_ids_for_user(payload["sub"])
    is_group_admin = bool(admin_group_ids)
    if is_group_admin:
        all_roles = list(set(all_roles + ["group_admin"]))
    else:
        all_roles = [role for role in all_roles if role != "group_admin"]

    return Principal(
        user_id=payload["sub"],
        username=payload.get("preferred_username", ""),
        email=payload.get("email"),
        groups=groups,
        roles=all_roles,
        permissions=all_roles,
        is_superuser=is_superuser,
        is_group_admin=is_group_admin,
        admin_group_ids=admin_group_ids,
        scope=payload.get("scope", ""),
    )


def require_superuser(principal: Principal = Depends(get_current_principal)) -> Principal:
    """
    Enforce superuser-only access on an endpoint.

    This is necessary for operations that must be limited to platform-level
    administrators. Returns the same Principal object on success, otherwise
    raises HTTPException(403) with detail "Superuser required".
    """
    if not principal.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superuser required")
    return principal


def require_superuser_or_group_admin(
    principal: Principal = Depends(get_current_principal),
) -> Principal:
    """
    Enforce access for superusers or delegated group admins.

    This is necessary for endpoints that can be managed by either global admins
    or scoped group admins. Returns the same Principal object on success,
    otherwise raises HTTPException(403) with detail
    "Group admin or superuser required".
    """
    if not (principal.is_superuser or principal.is_group_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Group admin or superuser required",
        )
    return principal


def require_permissions(required: list[str]):
    """
    Build a dependency that checks for required permissions.

    This is necessary for per-endpoint RBAC checks while allowing superusers to
    bypass permission filtering. Returns a callable dependency that yields a
    Principal on success or raises HTTPException(403) with
    "Missing permissions: ...".
    """
    def dep(principal: Principal = Depends(get_current_principal)) -> Principal:
        """
        Validate a principal against the outer required-permissions list.

        This is necessary because FastAPI consumes this closure as the actual
        dependency. Returns the same Principal object when authorized, otherwise
        raises HTTPException(403) listing missing permissions.
        """
        if principal.is_superuser:
            return principal
        missing = [p for p in required if p not in principal.permissions]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {', '.join(missing)}",
            )
        return principal
    return dep
