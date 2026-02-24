from __future__ import annotations
import logging
import httpx
from api.settings import get_settings

settings = get_settings()
logger = logging.getLogger("uvicorn")

async def _admin_token() -> str:
    """Fetch a Keycloak admin access token for subsequent bootstrap API calls.

    This is required because group/user creation and membership updates use the
    Keycloak admin endpoints, which require a bearer token from the master realm
    token endpoint response. The endpoint returns an OAuth token payload object
    that includes fields like `access_token`, `expires_in`, and `token_type`; this
    function returns the `access_token` string only.
    """
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
        return resp.json()["access_token"]


async def _ensure_group(token: str, name: str) -> str:
    """Get or create a Keycloak group and return its group id.

    This is necessary to make bootstrap idempotent: the same startup path can run
    repeatedly without creating duplicate groups. The `GET /groups` response is a
    JSON array of group objects (for example: `{"id": "...", "name": "...", ...}`);
    this function filters by exact group name and returns the matched group's `id`.
    """
    base = settings.kc_admin_url
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base}/groups", params={"search": name}, headers=headers)
        resp.raise_for_status()
        groups = [g for g in resp.json() if g["name"] == name]
        if groups:
            return groups[0]["id"]
        create = await client.post(f"{base}/groups", json={"name": name}, headers=headers)
        if create.status_code not in (201, 409):
            create.raise_for_status()
        # fetch again after create
        resp2 = await client.get(f"{base}/groups", params={"search": name}, headers=headers)
        resp2.raise_for_status()
        return next(g["id"] for g in resp2.json() if g["name"] == name)


async def _set_password(token: str, user_id: str, password: str) -> None:
    """Set a non-temporary password for a Keycloak user account.

    This is needed so seeded users can authenticate immediately and are not forced
    through reset actions on first login. The reset-password endpoint is invoked
    for side effects and does not return a payload used by this code; this function
    returns `None`.
    """
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        await client.put(
            f"{settings.kc_admin_url}/users/{user_id}/reset-password",
            json={"type": "password", "value": password, "temporary": False},
            headers=headers,
        )


async def _ensure_user(token: str, username: str, password: str) -> str:
    """Get or create a Keycloak user, normalize flags, and return the user id.

    This keeps bootstrap idempotent and enforces consistent user settings
    (`emailVerified`, `requiredActions`) each time startup runs. The
    `GET /users?username=...` response is a JSON array of user objects
    (for example: `{"id": "...", "username": "...", ...}`); if a user exists,
    this function returns that object's `id`. On create, it extracts the new id
    from the `Location` response header and returns it.
    """
    base = settings.kc_admin_url
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base}/users", params={"username": username}, headers=headers)
        resp.raise_for_status()
        users = [u for u in resp.json() if u["username"] == username]
        if users:
            user_id = users[0]["id"]
            await client.put(
                f"{base}/users/{user_id}",
                json={"requiredActions": [], "emailVerified": True},
                headers=headers,
            )
            await _set_password(token, user_id, password)
            return user_id
        body = {
            "username": username,
            "email": username,
            "enabled": True,
            "emailVerified": True,
            "requiredActions": [],
        }
        create = await client.post(f"{base}/users", json=body, headers=headers)
        if create.status_code not in (201, 409):
            create.raise_for_status()
        location = create.headers.get("Location", "")
        user_id = location.rstrip("/").split("/")[-1]
        await _set_password(token, user_id, password)
        return user_id


async def _assign_user_to_group(token: str, user_id: str, group_id: str) -> None:
    """Attach a user to a Keycloak group.

    This is required to realize role/group-based access defaults during bootstrap.
    The membership endpoint is called for side effects and the response payload is
    not consumed by this module; this function returns `None`.
    """
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        await client.put(
            f"{settings.kc_admin_url}/users/{user_id}/groups/{group_id}",
            headers=headers,
        )


async def seed_keycloak_defaults() -> None:
    """Seed baseline Keycloak groups and users from application settings.

    This orchestrates bootstrap so environments start with predictable access
    control data (superuser, default groups, and group memberships) while
    tolerating temporary Keycloak outages. It returns no response object and
    instead logs success/failure details for each seed operation, returning `None`.
    """
    try:
        token = await _admin_token()
    except Exception as exc:
        logger.warning("KC bootstrap skipped — cannot reach Keycloak: %s", exc)
        return

    # Seed superuser
    if settings.SUPERUSER_USERNAME and settings.SUPERUSER_PASSWORD:
        try:
            superuser_id = await _ensure_user(
                token, settings.SUPERUSER_USERNAME, settings.SUPERUSER_PASSWORD
            )
            super_group_id = await _ensure_group(token, settings.SUPERUSER_GROUP_NAME)
            await _assign_user_to_group(token, superuser_id, super_group_id)
            logger.info("KC bootstrap: superuser '%s' ready", settings.SUPERUSER_USERNAME)
        except Exception as exc:
            logger.warning("KC bootstrap: superuser seed failed: %s", exc)

    # Seed groups and users
    for group_name, usernames in settings.DEFAULT_GROUPS_AND_USERS.items():
        try:
            group_id = await _ensure_group(token, group_name)
            for username in usernames:
                user_id = await _ensure_user(token, username, settings.SUPERUSER_PASSWORD)
                await _assign_user_to_group(token, user_id, group_id)
            logger.info("KC bootstrap: group '%s' seeded", group_name)
        except Exception as exc:
            logger.warning("KC bootstrap: group '%s' seed failed: %s", group_name, exc)
