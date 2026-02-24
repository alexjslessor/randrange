from __future__ import annotations

import os
import asyncio
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Use a local SQLite DB file as a fast stand-in for PostgreSQL in unit tests.
TEST_DB_PATH = Path(__file__).resolve().parent / "users.db"
DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

# Set required environment variables for tests before importing app modules.
os.environ["DATABASE_URL"] = DATABASE_URL
os.environ["METADATA_DATABASE_URL"] = DATABASE_URL
os.environ["SECRET"] = os.getenv("SECRET", "test-secret")
os.environ["LIFETIME_SECONDS"] = os.getenv("LIFETIME_SECONDS", "3600")
os.environ.setdefault("AUDIENCE", "aud-var")
os.environ.setdefault("DBNAME", "users")
os.environ["DEFAULT_REALM_SLUG"] = "default"
os.environ["DEFAULT_REALM_NAME"] = "Default Realm"
os.environ["DEFAULT_CLIENT_ID"] = "frontend-react"
os.environ["DEFAULT_CLIENT_REDIRECT_URIS"] = (
    "http://localhost:3002/login/callback,http://localhost:3002"
)
os.environ["RUN_SCHEMA_SYNC_ON_STARTUP"] = "false"

from api.db import get_db
from api.main import app
from api.models import AuthBase

test_engine = create_async_engine(DATABASE_URL)
TestingSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_auth_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(AuthBase.metadata.drop_all)
        await conn.run_sync(AuthBase.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(AuthBase.metadata.drop_all)


@pytest.fixture(scope="session", autouse=False)
def event_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def api():
    # Intentionally bypass LifespanManager: startup includes postgres-specific DDL.
    yield app


@pytest_asyncio.fixture
async def test_client(api):
    async with AsyncClient(transport=ASGITransport(app=api), base_url="http://app.io") as client:
        yield client
