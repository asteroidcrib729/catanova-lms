from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.app.api import create_app
from backend.app.api.config import ApiSettings, Environment
from backend.app.api.security import get_database
from backend.app.api.sessions import IssuedSession
from backend.app.domain import UserRole
from backend.app.services import AuthenticatedPrincipal


def test_login_csrf_cookie_is_readable_at_dashboard_path() -> None:
    app = create_app(ApiSettings(environment=Environment.TEST))
    principal = AuthenticatedPrincipal(1, "Audit", "audit.user", UserRole.ADMINISTRATOR)
    expires = datetime.now(UTC) + timedelta(hours=1)

    def authenticate(username: str, password: str) -> AuthenticatedPrincipal:
        return principal

    def issue(user: AuthenticatedPrincipal) -> IssuedSession:
        return IssuedSession("opaque-session", "csrf-token", user, expires)

    app.state.authentication_service = SimpleNamespace(authenticate=authenticate)
    app.state.session_store = SimpleNamespace(create=issue)
    app.dependency_overrides[get_database] = object
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/login",
        headers={"Origin": "http://localhost:3000"},
        json={"username": "audit.user", "password": "synthetic password"},
    )
    assert response.status_code == 200
    cookies = {cookie.name: cookie for cookie in client.cookies.jar}
    assert cookies["lms_csrf"].path == "/"
    assert cookies["lms_session"].has_nonstandard_attr("HttpOnly")
    assert not cookies["lms_csrf"].has_nonstandard_attr("HttpOnly")
