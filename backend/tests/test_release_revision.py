import pytest
from fastapi.testclient import TestClient

from backend.app.api import create_app
from backend.app.api.config import ApiSettings, Environment


@pytest.mark.parametrize("revision", ("a" * 40, "not-a-commit-secret"))
def test_health_exposes_only_a_valid_release_sha(
    revision: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("RENDER_GIT_COMMIT", revision)
    client = TestClient(create_app(ApiSettings(environment=Environment.TEST)))
    data = client.get("/health/live").json()
    if revision == "a" * 40:
        assert data["revision"] == revision
    else:
        assert "revision" not in data
