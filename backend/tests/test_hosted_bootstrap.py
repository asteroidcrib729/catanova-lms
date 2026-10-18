import pytest
from fastapi.testclient import TestClient

from backend.app.api import create_app
from backend.app.api.config import ApiSettings, Environment
from backend.app.api.security import get_database


@pytest.mark.parametrize(
    "environment", (Environment.PRODUCTION, Environment.STAGING, Environment.PREVIEW)
)
def test_hosted_browser_cannot_claim_first_administrator(environment: Environment) -> None:
    app = create_app(ApiSettings(environment=environment, allowed_origins=("https://app.example",)))
    app.dependency_overrides[get_database] = object
    response = TestClient(app).post(
        "/api/v1/accounts/bootstrap-administrator",
        headers={"Origin": "https://app.example"},
        json={
            "display_name": "Not an operator",
            "username": "public.visitor",
            "password": "some long password",
        },
    )
    assert response.status_code == 403
    assert "owner command" in response.json()["message"]
