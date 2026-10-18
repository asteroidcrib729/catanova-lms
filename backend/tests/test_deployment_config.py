import json
from pathlib import Path

from backend.scripts.validate_deployment import REPOSITORY_ROOT, validate_repository


def test_committed_deployment_configuration_is_consistent() -> None:
    assert validate_repository() == []


def test_validator_rejects_database_secret_in_vercel_configuration(tmp_path: Path) -> None:
    _copy_contract_files(tmp_path)
    vercel_path = tmp_path / "frontend" / "vercel.json"
    vercel = json.loads(vercel_path.read_text(encoding="utf-8"))
    vercel["env"] = {"DATABASE_URL": "forbidden"}
    vercel_path.write_text(json.dumps(vercel), encoding="utf-8")

    assert any("DATABASE_URL" in error for error in validate_repository(tmp_path))


def test_validator_rejects_automatic_production_deployment(tmp_path: Path) -> None:
    _copy_contract_files(tmp_path)
    workflow_path = tmp_path / ".github" / "workflows" / "deploy-production.yml"
    workflow = workflow_path.read_text(encoding="utf-8")
    workflow_path.write_text(workflow.replace("workflow_dispatch:", "push:"), encoding="utf-8")

    assert any("manual" in error for error in validate_repository(tmp_path))


def test_validator_requires_repository_render_root(tmp_path: Path) -> None:
    _copy_contract_files(tmp_path)
    render_path = tmp_path / "render.yaml"
    render = render_path.read_text(encoding="utf-8")
    render_path.write_text(
        render.replace("runtime: python", "runtime: python\n    rootDir: backend"),
        encoding="utf-8",
    )

    assert any("repository root" in error for error in validate_repository(tmp_path))


def test_validator_requires_the_backend_asgi_entry_point(tmp_path: Path) -> None:
    _copy_contract_files(tmp_path)
    render_path = tmp_path / "render.yaml"
    render = render_path.read_text(encoding="utf-8")
    render_path.write_text(
        render.replace("backend.app.main:app", "backend.app.cli.main:app"),
        encoding="utf-8",
    )

    assert any("backend.app.main:app" in error for error in validate_repository(tmp_path))


def _copy_contract_files(target: Path) -> None:
    paths = (
        Path("deploy/environment-contract.json"),
        Path("render.yaml"),
        Path("frontend/vercel.json"),
        Path(".github/workflows/deploy-production.yml"),
        Path(".github/workflows/backup-production.yml"),
    )
    for relative in paths:
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            (REPOSITORY_ROOT / relative).read_text(encoding="utf-8"),
            encoding="utf-8",
        )
