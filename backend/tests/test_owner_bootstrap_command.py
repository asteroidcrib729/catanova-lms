import sys
from unittest.mock import MagicMock

import pytest

from backend.scripts import bootstrap_administrator as command


@pytest.mark.parametrize(
    ("name", "username", "password", "message", "password_prompts"),
    [
        ("", "owner", "valid long password", "Display name", False),
        ("Owner", "owner@example.com", "valid long password", "not an email", False),
        ("Owner", "owner", "too-short", "12-128 characters", True),
        ("Owner", "owner", " " * 12, "not only whitespace", True),
    ],
)
def test_owner_input_failure_is_specific_and_never_echoes_credentials(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    name: str,
    username: str,
    password: str,
    message: str,
    password_prompts: bool,
) -> None:
    monkeypatch.setenv("LMS_ENVIRONMENT", "production")
    monkeypatch.setattr(
        sys, "argv", ["owner", "--environment", "production", "--confirm-production"]
    )
    database = MagicMock()
    monkeypatch.setattr(command, "PostgresSettings", MagicMock())
    monkeypatch.setattr(command, "PostgresDatabase", MagicMock(return_value=database))
    inputs = iter((name, username))

    def read_input(_prompt: str) -> str:
        return next(inputs)

    password_reader = MagicMock(return_value=password)
    monkeypatch.setattr("builtins.input", read_input)
    monkeypatch.setattr(command.getpass, "getpass", password_reader)
    account_service = MagicMock()
    monkeypatch.setattr(command, "AccountService", account_service)
    assert command.main() == 1
    output = capsys.readouterr().out
    assert message in output
    assert password not in output
    assert username not in output
    assert bool(password_reader.call_count) is password_prompts
    account_service.assert_not_called()
    database.close.assert_called_once()
