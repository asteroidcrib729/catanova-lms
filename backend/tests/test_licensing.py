"""Keep source-distribution licensing and frontend metadata consistent offline."""

import json
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LICENSE_FILES = ["LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md"]


def test_python_metadata_declares_spdx_and_packaged_notices() -> None:
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]

    assert project["license"] == "Apache-2.0"
    assert project["license-files"] == LICENSE_FILES
    for filename in LICENSE_FILES:
        assert (ROOT / filename).read_text(encoding="utf-8").strip()


def test_frontend_and_lockfile_declare_the_same_license() -> None:
    package = json.loads((ROOT / "frontend/package.json").read_text(encoding="utf-8"))
    lock = json.loads((ROOT / "frontend/package-lock.json").read_text(encoding="utf-8"))

    assert package["license"] == lock["packages"][""]["license"] == "Apache-2.0"
    assert package["private"] is True


def test_notice_preserves_original_author_and_repository() -> None:
    notice = (ROOT / "NOTICE").read_text(encoding="utf-8")

    assert "Copyright 2026 Faraz Hussain" in notice
    assert "asteroidcrib729" in notice
    assert "https://github.com/asteroidcrib729/catanova-lms" in notice
    assert "does not add conditions to or modify" in notice


def test_license_and_third_party_terms_are_separate() -> None:
    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8")
    third_party = (ROOT / "THIRD_PARTY_NOTICES.md").read_text(encoding="utf-8")

    assert "Version 2.0, January 2004" in license_text
    assert "END OF TERMS AND CONDITIONS" in license_text
    assert "Copyright [yyyy] [name of copyright owner]" in license_text
    assert "The MIT License (MIT)" in third_party
    assert "Copyright (c) 2025 Vercel, Inc." in third_party
