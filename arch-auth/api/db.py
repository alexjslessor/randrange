from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession, 
    async_sessionmaker, 
    create_async_engine,
)
from api.settings import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


metadata_engine = create_async_engine(
    settings.METADATA_DATABASE_URL,
    pool_pre_ping=True,
)
MetadataAsyncSessionLocal = async_sessionmaker(
    metadata_engine,
    expire_on_commit=False,
)

async def get_metadata_db() -> AsyncGenerator[AsyncSession, None]:
    async with MetadataAsyncSessionLocal() as session:
        yield session
