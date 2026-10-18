"""Guarded owner-run schema initialization, separate from application startup."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import psycopg

from backend.app.postgres.config import PostgresSettings
from backend.app.postgres.inspection import reconcile_empty_source, validate_empty_source
from backend.app.postgres.migrations import (
    MIGRATIONS_DIRECTORY,
    MigrationError,
    initialize_schema,
    verify_managed_schema,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("initialize", "verify"))
    parser.add_argument("--provider", choices=("postgres", "prisma"), required=True)
    parser.add_argument(
        "--environment", choices=("local", "development", "production"), required=True
    )
    parser.add_argument("--commit", action="store_true", help="otherwise roll back the rehearsal")
    parser.add_argument("--confirm-production", action="store_true")
    parser.add_argument("--empty-source-snapshot", type=Path)
    parser.add_argument("--require-administrator", action="store_true")
    arguments = parser.parse_args()
    if arguments.command == "verify" and (arguments.commit or arguments.empty_source_snapshot):
        parser.error("Verification is read-only and cannot commit or restore a snapshot.")
    if arguments.environment != os.environ.get("LMS_ENVIRONMENT", "local"):
        parser.error("Explicit environment must match LMS_ENVIRONMENT.")
    if arguments.environment == "production" and not arguments.confirm_production:
        parser.error("Production requires --confirm-production, including rehearsals.")
    url = os.environ.get("DATABASE_URL", "")
    try:
        settings = PostgresSettings(url, environment=arguments.environment)
        snapshot = None
        snapshot_hash = None
        if arguments.empty_source_snapshot:
            content = arguments.empty_source_snapshot.read_bytes()
            snapshot = json.loads(content)
            validate_empty_source(snapshot)
            snapshot_hash = hashlib.sha256(content).hexdigest()
        with (
            psycopg.connect(settings.url, connect_timeout=10) as connection,
            connection.transaction(force_rollback=not arguments.commit),
        ):
            if arguments.command == "verify":
                connection.execute("SET TRANSACTION READ ONLY")
            connection.execute("SET LOCAL lock_timeout='5s'")
            connection.execute("SET LOCAL statement_timeout='30s'")
            if arguments.command == "verify":
                result = {
                    "initialized": False,
                    "verified": True,
                    **verify_managed_schema(connection, provider=arguments.provider),
                }
            else:
                result = initialize_schema(
                    connection, MIGRATIONS_DIRECTORY, provider=arguments.provider
                )
            if arguments.require_administrator:
                administrator = connection.execute(
                    "SELECT EXISTS(SELECT 1 FROM lms.users WHERE role='administrator' "
                    "AND is_active)"
                ).fetchone()
                if not administrator or not administrator[0]:
                    raise MigrationError(
                        "An active administrator must be provisioned by the owner."
                    )
            if snapshot is not None:
                if not result["initialized"]:
                    raise MigrationError(
                        "Source restore requires a newly initialized empty target."
                    )
                reconcile_empty_source(connection, snapshot)
        print(
            json.dumps(
                {**result, "committed": arguments.commit, "source_snapshot_sha256": snapshot_hash}
            )
        )
    except (psycopg.Error, MigrationError, ValueError, OSError) as error:
        # Never echo connection strings, SQL payloads, or provider credentials.
        message = (
            str(error) if isinstance(error, MigrationError) else "Check configuration or access."
        )
        print(json.dumps({"error": type(error).__name__, "message": message, "committed": False}))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
