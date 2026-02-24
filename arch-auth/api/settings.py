from functools import lru_cache
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TITLE: str = "Auth API"
    OPENAPI_URL: str = "/docs_openapi"
    DOCS_URL: str = "/docs"
    PREFIX: str = ""

    DATABASE_URL: str = "postgresql+asyncpg://arch_auth:arch_auth@postgres:5432/users"
    METADATA_DATABASE_URL: str = "postgresql+asyncpg://metadata:metadata@postgres:5432/metadata"

    PREFECT_API_URL: str = "http://prefect-server:4200/api"
    PREFECT_REQUEST_TIMEOUT_SECONDS: float = 15.0

    # Keycloak
    KC_URL: str = "http://keycloak:8080"
    KC_REALM: str = "demo-mcp"
    KC_CLIENT_ID: str = "frontend-react"
    KC_ADMIN_USERNAME: str = "admin"
    KC_ADMIN_PASSWORD: str = "admin"

    # Groups to seed in KC on startup
    DEFAULT_GROUPS_AND_USERS: dict = {
        "CM": ["cm-user@gmail.com", "cm-admin@gmail.com"],
        "TM": ["tm-user@gmail.com", "tm-admin@gmail.com"],
        "FCU": ["fcu-user@gmail.com", "fcu-admin@gmail.com"],
    }
    SUPERUSER_USERNAME: str = ""
    SUPERUSER_PASSWORD: str = ""
    SUPERUSER_GROUP_NAME: str = "superusers"

    # Signup notification email
    SIGNUP_NOTIFICATION_ENABLED: bool = True
    SIGNUP_NOTIFICATION_SMTP_HOST: str = "mailhog"
    SIGNUP_NOTIFICATION_SMTP_PORT: int = 1025
    SIGNUP_NOTIFICATION_FROM_EMAIL: str = "arch-auth@localhost"
    SIGNUP_NOTIFICATION_TO_EMAIL: str = "alexjslessor@gmail.com"

    CORS_ORIGINS: list[AnyHttpUrl | str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:3002",
        "*",
    ]

    @property
    def kc_realm_url(self) -> str:
        return f"{self.KC_URL}/realms/{self.KC_REALM}"

    @property
    def kc_token_url(self) -> str:
        return f"{self.kc_realm_url}/protocol/openid-connect/token"

    @property
    def kc_jwks_url(self) -> str:
        return f"{self.kc_realm_url}/protocol/openid-connect/certs"

    @property
    def kc_admin_url(self) -> str:
        return f"{self.KC_URL}/admin/realms/{self.KC_REALM}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
