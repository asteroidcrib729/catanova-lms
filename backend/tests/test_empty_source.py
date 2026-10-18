from typing import Any

import pytest

from backend.app.postgres.inspection import TABLES, validate_empty_source
from backend.app.postgres.migrations import MigrationError


def test_empty_source_validator_rejects_populated_or_advanced_source() -> None:
    snapshot: dict[str, Any] = {
        "rows": {name: [] for name in TABLES},
        "sequence_states": {
            str(index): {"last_value": "1", "is_called": False} for index in range(9)
        },
    }
    snapshot["rows"]["schema_version"] = [{"version": version} for version in (1, 2, 3)]
    validate_empty_source(snapshot)
    snapshot["rows"]["users"] = [{"id": 1}]
    with pytest.raises(MigrationError, match="full consistent"):
        validate_empty_source(snapshot)
    snapshot["rows"]["users"] = []
    snapshot["sequence_states"]["0"]["is_called"] = True
    with pytest.raises(MigrationError, match="sequence state"):
        validate_empty_source(snapshot)
