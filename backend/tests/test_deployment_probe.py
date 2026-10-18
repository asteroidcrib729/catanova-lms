from argparse import Namespace
from http.client import HTTPMessage
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from backend.scripts.deployment_probe import (
    Observation,
    ProbeFailure,
    parse_server_timing,
    run_smoke,
    summarize,
    validate_origin,
)


def test_hosted_probe_requires_a_credential_free_https_origin() -> None:
    assert validate_origin("https://api.staging.example") == "https://api.staging.example"
    with pytest.raises(ValueError, match="HTTPS"):
        validate_origin("http://api.staging.example")
    with pytest.raises(ValueError, match="credential-free"):
        validate_origin("https://user:secret@api.staging.example")
    with pytest.raises(ValueError, match="Origins"):
        validate_origin("https://api.staging.example/path")


def test_probe_permits_explicit_loopback_http_for_local_rehearsal() -> None:
    assert validate_origin("http://127.0.0.1:8000") == "http://127.0.0.1:8000"


def test_latency_summary_uses_nearest_rank_p95() -> None:
    result = summarize([float(value) for value in range(1, 21)])

    assert result == {
        "minimum_ms": 1.0,
        "median_ms": 10.5,
        "p95_ms": 19.0,
        "maximum_ms": 20.0,
    }


def test_server_timing_parser_separates_application_and_database_spans() -> None:
    value = "app;dur=12.45, db;dur=3.20"

    assert parse_server_timing(value, "app") == 12.45
    assert parse_server_timing(value, "db") == 3.2
    assert parse_server_timing(value, "missing") is None


@pytest.mark.parametrize("same_origin", [True, False])
@pytest.mark.parametrize("cache_control", ["private, no-store", "public"])
def test_smoke_checks_correct_browser_boundary_and_logout(
    monkeypatch: pytest.MonkeyPatch, same_origin: bool, cache_control: str
) -> None:
    web_origin = "https://dashboard.example"
    client = MagicMock()
    client.cookies = [SimpleNamespace(name="lms_csrf", value="test-csrf")]
    calls: list[str] = []

    def reply(
        name: str, *_args: object, **_kwargs: object
    ) -> tuple[Observation, bytes, HTTPMessage]:
        calls.append(name)
        headers = HTTPMessage()
        headers["X-Content-Type-Options"] = "nosniff"
        headers["X-Frame-Options"] = "DENY"
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if not same_origin:
            headers["Access-Control-Allow-Origin"] = web_origin
        headers["Cache-Control"] = cache_control
        if name == "login":
            headers["Set-Cookie"] = "lms_session=test; Secure; HttpOnly; SameSite=Lax; Path=/"
            headers["Set-Cookie"] = "lms_csrf=test-csrf; Secure; SameSite=Lax; Path=/"
        status = {
            "untrusted_origin": 403,
            "missing_csrf": 403,
            "logout": 204,
            "revoked_session": 401,
        }.get(name, 200)
        return Observation(name, status, 1, 0, True, "app;dur=1"), b"", headers

    client.request.side_effect = reply

    def create_client(_timeout: float) -> MagicMock:
        return client

    monkeypatch.setattr("backend.scripts.deployment_probe.DeploymentClient", create_client)
    monkeypatch.setenv("SMOKE_TEST_USERNAME", "test-user")
    monkeypatch.setenv("SMOKE_TEST_PASSWORD", "test-password")
    arguments = Namespace(
        api_origin=web_origin if same_origin else "https://api.example",
        web_origin=web_origin,
        timeout=5,
        username_environment="SMOKE_TEST_USERNAME",
        password_environment="SMOKE_TEST_PASSWORD",
        session_cookie="lms_session",
        csrf_cookie="lms_csrf",
    )
    if same_origin and cache_control == "public":
        with pytest.raises(ProbeFailure, match="shared caching"):
            run_smoke(arguments)
        return
    result = run_smoke(arguments)
    assert result["authenticated_session_checked"] is True
    assert result["same_origin_relay"] is same_origin
    assert ("cors_preflight" in calls) is not same_origin
    assert calls[-3:] == ["missing_csrf", "logout", "revoked_session"]
