import asyncio
import logging
import logging.config
import os
import socket
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, OperationalError

from api.auth.bootstrap import seed_keycloak_defaults
from api.db import engine, metadata_engine
from api.logs import LOGGING_CONFIG
from api.models.base import AuthBase, MetadataBase

logger = logging.getLogger("uvicorn")
MAX_RETRIES = int(os.getenv("DB_STARTUP_RETRIES", "8"))
BASE_DELAY = float(os.getenv("DB_STARTUP_DELAY", "1.5"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.config.dictConfig(LOGGING_CONFIG)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
                await conn.run_sync(AuthBase.metadata.create_all)

            async with metadata_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
                await conn.run_sync(MetadataBase.metadata.create_all)

            logger.info("Database connections established.")
            break
        except (socket.gaierror, OperationalError, DBAPIError, OSError) as exc:
            logger.warning(
                "DB connect failed (attempt %s/%s): %s",
                attempt,
                MAX_RETRIES,
                repr(exc),
            )
            if attempt == MAX_RETRIES:
                raise RuntimeError("Database connection cannot be established on startup") from exc
            await asyncio.sleep(BASE_DELAY * attempt)

    await seed_keycloak_defaults()

    try:
        yield
    finally:
        await engine.dispose()
        await metadata_engine.dispose()
        logger.info("Engine disposed.")
