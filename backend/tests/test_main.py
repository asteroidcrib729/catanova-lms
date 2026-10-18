import pytest
from uvicorn.importer import import_from_string

from backend.app.cli.main import main
from backend.app.main import app


def test_version_option_reports_application_version(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main(["--version"])

    assert exit_info.value.code == 0
    assert capsys.readouterr().out.strip() == "CataNova 0.1.0"


def test_uvicorn_entry_point_resolves_to_the_fastapi_app() -> None:
    assert import_from_string("backend.app.main:app") is app
