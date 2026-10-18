"""Deterministic OpenAPI rendering used by local tooling and CI."""

from __future__ import annotations

import json

from backend.app.api.config import ApiSettings, Environment
from backend.app.api.factory import create_app


def render_contract() -> str:
    """Return stable, reviewable JSON for the current API contract."""
    application = create_app(
        ApiSettings(
            environment=Environment.TEST,
            allowed_origins=("http://testserver",),
        )
    )
    return json.dumps(application.openapi(), indent=2, sort_keys=True) + "\n"
