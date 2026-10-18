"""Development command for the FastAPI delivery adapter."""

from __future__ import annotations

import uvicorn

from backend.app.api.config import ApiSettings


def main() -> None:
    settings = ApiSettings.from_environment()
    uvicorn.run(
        "backend.app.api.factory:create_app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment.value == "local",
        factory=True,
    )


if __name__ == "__main__":
    main()
