import logging
import logging.config
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from api.logs import LOGGING_CONFIG
from api.on_startup import lifespan
from api.routers import (
    auth_routes, 
    prefect_gateway_routes, 
    metadata_routes,
)
from api.settings import get_settings

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger("uvicorn")
settings = get_settings()


class ErrorSchema(BaseModel):
    message: str | None = Field(default_factory=lambda: "")


responses: dict[int | str, dict[str, Any]] = {
    200: {"description": "Success"},
    400: {"model": ErrorSchema, "description": "Bad Request Error"},
    404: {"model": ErrorSchema, "description": "Not Found Error"},
    422: {"model": ErrorSchema, "description": "Unprocessable Entity Error"},
    500: {"model": ErrorSchema, "description": "Internal Server Error"},
}

app = FastAPI(
    title=settings.TITLE,
    docs_url=settings.DOCS_URL,
    openapi_url=settings.OPENAPI_URL,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def middleware_http(request: Request, call_next):
    try:
        logger.info("%s: %s", request.method, request.url.path)
        return await call_next(request)
    except Exception as exc:  # pragma: no cover - global fallback
        payload = {
            "error": f"Unknown middleware error: {exc!s}",
            "message": "Unknown error, please contact your system admin",
            "color": "error",
        }
        logger.error("Unhandled middleware error: %r", payload)
        return JSONResponse(status_code=500, content=jsonable_encoder(payload))


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "API is running"}


@app.get("/health", responses=responses)
async def read_health() -> dict[str, str]:
    return {"message": "healthy", "status": "ok"}


app.include_router(auth_routes.router, tags=['auth'])
app.include_router(prefect_gateway_routes.router, tags=['prefect'])
app.include_router(metadata_routes.metadata_router, tags=['metadata'])

