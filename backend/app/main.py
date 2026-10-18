"""FastAPI entry point: ``uvicorn backend.app.main:app``."""

from backend.app.api.factory import create_app

app = create_app()

__all__ = ["app"]
