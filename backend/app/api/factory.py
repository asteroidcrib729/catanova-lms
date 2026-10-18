"""Build an isolated FastAPI application without import-time I/O."""

from __future__ import annotations

from collections.abc import AsyncGenerator, Iterable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from backend.app import __version__
from backend.app.api.config import ApiSettings
from backend.app.api.errors import install_error_handlers
from backend.app.api.health import ProbeResult, ReadinessProbe, create_health_router
from backend.app.api.middleware import install_request_middleware
from backend.app.api.routes import create_api_router
from backend.app.api.security import SlidingWindowRateLimiter
from backend.app.api.sessions import BrowserSessionStore
from backend.app.postgres import PostgresDatabase, PostgresSettings
from backend.app.repositories.postgres import PostgresUnitOfWork
from backend.app.security import PasswordService
from backend.app.services import AuthenticationService


def create_app(
    settings: ApiSettings | None = None,
    *,
    readiness_probes: Iterable[ReadinessProbe] = (),
) -> FastAPI:
    """Create an isolated ASGI application for one configured environment."""
    resolved_settings = settings or ApiSettings.from_environment()
    database = (
        PostgresDatabase(
            PostgresSettings.from_environment(
                resolved_settings.database_url, resolved_settings.environment.value
            )
        )
        if resolved_settings.database_url
        else None
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        if database is not None:
            await run_in_threadpool(database.open)
        try:
            yield
        finally:
            if database is not None:
                await run_in_threadpool(database.close)

    def postgres_probe() -> ProbeResult:
        ready = database is not None and database.schema_ready()
        return ProbeResult(
            "postgresql",
            ready,
            "Database and schema are available."
            if ready
            else "Database unavailable or schema incompatible.",
        )

    application = FastAPI(
        title="CataNova API",
        summary="Catalog. Manage. Discover. The versioned API for the CataNova library workspace.",
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    application.state.api_settings = resolved_settings
    application.state.database = database
    password_service = PasswordService()
    application.state.password_service = password_service
    application.state.authentication_service = (
        AuthenticationService(
            lambda: PostgresUnitOfWork(database),
            password_service,
        )
        if database is not None
        else None
    )
    application.state.session_store = (
        BrowserSessionStore(
            database,
            idle_timeout=resolved_settings.session_idle_timeout,
            absolute_timeout=resolved_settings.session_absolute_timeout,
        )
        if database is not None
        else None
    )
    application.state.rate_limiter = SlidingWindowRateLimiter()
    application.state.readiness_probes = tuple(readiness_probes) + (
        (postgres_probe,) if database is not None else ()
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Content-Type",
            "Idempotency-Key",
            "Origin",
            "X-CSRF-Token",
            "X-Request-ID",
        ],
        expose_headers=["Server-Timing", "X-Request-ID"],
    )
    install_request_middleware(application, resolved_settings)
    install_error_handlers(application)
    application.include_router(create_health_router())
    application.include_router(create_api_router())
    return application
