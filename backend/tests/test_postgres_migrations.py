import pytest

from backend.app.postgres.migrations import (
    MIGRATIONS,
    MIGRATIONS_DIRECTORY,
    MigrationError,
    migration_sql,
)

DIRECTORY = MIGRATIONS_DIRECTORY


@pytest.mark.parametrize("name,digest", MIGRATIONS)
def test_historical_sql_pins_and_normal_postgres_acl_are_preserved(name: str, digest: str) -> None:
    content = (DIRECTORY / name).read_bytes()
    result = migration_sql(name, content, provider="postgres")
    assert "\nCOMMIT;" not in result
    assert len(digest) == 64
    if name != MIGRATIONS[1][0]:
        assert "REVOKE ALL" in result


@pytest.mark.parametrize("name,digest", MIGRATIONS)
def test_prisma_omits_only_reviewed_acls_and_preserves_rls(name: str, digest: str) -> None:
    content = (DIRECTORY / name).read_bytes()
    result = migration_sql(name, content, provider="prisma")
    assert "REVOKE ALL" not in result
    assert "SECURITY DEFINER" not in result
    assert "pg_advisory_xact_lock" in result
    if name != MIGRATIONS[1][0]:
        assert "ENABLE ROW LEVEL SECURITY" in result
    # Both LF and CRLF checkout bytes must map to the same reviewed migration.
    assert (
        migration_sql(
            name, content.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"), provider="prisma"
        )
        == result
    )


def test_modified_unknown_and_wrong_provider_sql_fail_closed() -> None:
    name, _ = MIGRATIONS[0]
    content = (DIRECTORY / name).read_bytes()
    for filename, body, provider in (
        (name, content + b"\nSELECT 1;", "prisma"),
        ("unreviewed.sql", content, "prisma"),
        (name, content, "unknown"),
    ):
        with pytest.raises(MigrationError):
            migration_sql(filename, body, provider=provider)
