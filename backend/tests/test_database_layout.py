"""Keep shared schema source independent of the optional local test engine."""

import tomllib
from pathlib import Path

import pytest

from backend.app.postgres.migrations import MIGRATIONS, MIGRATIONS_DIRECTORY

ROOT = Path(__file__).resolve().parents[2]


def test_only_the_reviewed_migrations_exist_in_the_shared_directory() -> None:
    assert MIGRATIONS_DIRECTORY == ROOT / "database" / "migrations"
    assert {path.name for path in MIGRATIONS_DIRECTORY.glob("*.sql")} == {
        name for name, _ in MIGRATIONS
    }
    assert not (ROOT / "supabase").exists()
    assert not (ROOT / "database" / "local" / "supabase" / "migrations").exists()


def test_shared_directory_is_resolved_independently_of_working_directory(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    assert MIGRATIONS_DIRECTORY.is_absolute()
    assert all((MIGRATIONS_DIRECTORY / name).is_file() for name, _ in MIGRATIONS)


def test_optional_stack_supplies_only_an_isolated_database_engine() -> None:
    config_path = ROOT / "database" / "local" / "supabase" / "config.toml"
    config = tomllib.loads(config_path.read_text(encoding="utf-8"))
    assert config["project_id"] == "catanova-test"
    assert config["db"]["major_version"] == 17
    assert config["db"]["port"] == 55432
    assert config["db"]["migrations"]["enabled"] is False
    assert config["db"]["seed"]["enabled"] is False
    for service in ("api", "auth", "studio", "realtime", "storage", "edge_runtime", "analytics"):
        assert config[service]["enabled"] is False


def test_ci_and_powershell_use_the_relocated_stack() -> None:
    workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    assert "cat database/local/supabase/CLI_VERSION" in workflow
    assert "start --workdir database/local" in workflow
    assert "LMS_TEST_POSTGRES_CONTAINER: supabase_db_catanova-test" in workflow
    assert "db reset" not in workflow
    helper = (ROOT / "scripts" / "dev.ps1").read_text(encoding="utf-8")
    assert '"database\\local"' in helper
    assert "start --workdir $localDatabaseRoot" in helper
    checks = (ROOT / "scripts" / "check.ps1").read_text(encoding="utf-8")
    assert '"supabase_db_catanova-test"' in checks
