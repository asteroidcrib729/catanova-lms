"""Exercise both adapters against the shared SQL in an empty disposable database."""

from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import psycopg
import pytest
from psycopg import sql

from backend.app.postgres.migrations import (
    MIGRATIONS,
    MIGRATIONS_DIRECTORY,
    initialize_schema,
    verify_managed_schema,
)

pytestmark = pytest.mark.postgres


@pytest.mark.parametrize("provider", ("postgres", "prisma"))
def test_relocated_sql_initializes_rolls_back_and_verifies_without_replay(
    pg_url: str,
    provider: str,
) -> None:
    name = "lms_test_source_" + uuid4().hex
    target_url = urlunsplit(urlsplit(pg_url)._replace(path="/" + name))
    with psycopg.connect(pg_url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(name)))
        try:
            with psycopg.connect(target_url, autocommit=True) as connection:
                # A rehearsal must leave neither the application schema nor ledger behind.
                with connection.transaction(force_rollback=True):
                    result = initialize_schema(connection, MIGRATIONS_DIRECTORY, provider=provider)
                    assert result["initialized"] is True
                    assert result["rls_tables"] == 12
                assert connection.execute(
                    "SELECT to_regnamespace('lms'), to_regnamespace('catanova_admin')"
                ).fetchone() == (None, None)

                with connection.transaction():
                    initialize_schema(connection, MIGRATIONS_DIRECTORY, provider=provider)
                with connection.transaction():
                    result = initialize_schema(connection, MIGRATIONS_DIRECTORY, provider=provider)
                    assert result["initialized"] is False
                    assert result["verified"] is True
                with connection.transaction():
                    connection.execute("SET TRANSACTION READ ONLY")
                    assert verify_managed_schema(connection, provider=provider)["rls_tables"] == 12
                    assert connection.execute(
                        "SELECT filename, sha256, provider FROM catanova_admin.migration_history "
                        "ORDER BY filename"
                    ).fetchall() == [(name, digest, provider) for name, digest in MIGRATIONS]
        finally:
            admin.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(name)))
