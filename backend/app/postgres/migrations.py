"""Explicit, checksum-pinned schema initialization; never called by API startup."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from psycopg import Connection
from psycopg.rows import dict_row

MIGRATIONS_DIRECTORY = Path(__file__).resolve().parents[3] / "database" / "migrations"

MIGRATIONS = (
    (
        "20260905000100_initial_lms.sql",
        "7f0b3df6a01ade0ed83d61d5ec5bac45f6f4d8ecf4a9c4da5db317f048e544dc",
    ),
    (
        "20260905000200_idempotency_claims.sql",
        "27ae049d71dfdbe988c63cebe550d4131857c8c55f12f0e63765d30ed698f8b5",
    ),
    (
        "20260906000100_browser_sessions.sql",
        "fc94639d8af4fcd05feecb8f7a58e4487732ab75121841a131ef94dca84034cb",
    ),
)

# Prisma disallows ACL DDL. Only these reviewed statements may be omitted, and
# only from byte-identical historical files. No SQL exceptions are suppressed.
PRISMA_ACL_OMISSIONS = {
    MIGRATIONS[0][0]: frozenset(
        {
            "REVOKE ALL ON SCHEMA lms FROM PUBLIC;",
            "REVOKE ALL ON ALL TABLES IN SCHEMA lms FROM PUBLIC;",
            "REVOKE ALL ON ALL SEQUENCES IN SCHEMA lms FROM PUBLIC;",
            "ALTER DEFAULT PRIVILEGES IN SCHEMA lms REVOKE ALL ON TABLES FROM PUBLIC;",
        }
    ),
    MIGRATIONS[1][0]: frozenset(),
    MIGRATIONS[2][0]: frozenset(
        {
            "REVOKE ALL ON lms.browser_sessions FROM PUBLIC;",
            "REVOKE ALL ON FUNCTION lms.revoke_sessions_for_inactive_user() FROM PUBLIC;",
        }
    ),
}


class MigrationError(ValueError):
    """A migration or permission assertion failed; the caller must roll back."""


def migration_sql(name: str, content: bytes, *, provider: str) -> str:
    """Fail closed on unknown SQL, edits, or a provider without a reviewed policy."""
    if provider not in {"postgres", "prisma"}:
        raise MigrationError("Unknown database provider.")
    expected = dict(MIGRATIONS).get(name)
    # Hash canonical LF bytes so a Windows Git checkout cannot break the pin.
    normalized = content.replace(b"\r\n", b"\n")
    if expected is None or hashlib.sha256(normalized).hexdigest() != expected:
        raise MigrationError("Historical migration checksum mismatch.")
    lines = normalized.decode("utf-8").splitlines()
    if lines.count("BEGIN;") != 1 or lines.count("COMMIT;") != 1:
        raise MigrationError("Unexpected migration transaction boundaries.")
    omissions = PRISMA_ACL_OMISSIONS[name] if provider == "prisma" else frozenset()
    if any(lines.count(statement) != 1 for statement in omissions):
        raise MigrationError("Reviewed ACL statement is missing or duplicated.")
    return "\n".join(line for line in lines if line not in omissions | {"BEGIN;", "COMMIT;"})


def initialize_schema(
    connection: Connection[Any], migrations_directory: Path, *, provider: str
) -> dict[str, Any]:
    """Initialize an empty target atomically, or verify a previous managed run.

    The caller owns the transaction and chooses commit vs rehearsal rollback.
    Ordinary databases still execute the original ACL statements unchanged.
    Prisma uses private-schema defaults plus verified RLS; it does NOT provide
    separate restricted runtime and migration SQL roles with these credentials.
    """
    scripts = [
        (
            name,
            digest,
            migration_sql(name, (migrations_directory / name).read_bytes(), provider=provider),
        )
        for name, digest in MIGRATIONS
    ]
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(1279873875, 0)")
        cursor.execute("SELECT to_regnamespace('lms') AS schema")
        exists = cursor.fetchone()
        if exists and exists["schema"] is not None:
            result = verify_managed_schema(connection, provider=provider)
            return {"initialized": False, "verified": True, **result}
        cursor.execute("SELECT to_regnamespace('catanova_admin') AS schema")
        reserved = cursor.fetchone()
        if reserved and reserved["schema"] is not None:
            raise MigrationError("Reserved migration schema already exists.")
        for _, _, script in scripts:
            cursor.execute(script.encode("utf-8"))
        cursor.execute("CREATE SCHEMA catanova_admin")
        cursor.execute(
            "CREATE TABLE catanova_admin.migration_history ("
            "filename text PRIMARY KEY, sha256 text NOT NULL, provider text NOT NULL, "
            "applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)"
        )
        cursor.execute("ALTER TABLE catanova_admin.migration_history ENABLE ROW LEVEL SECURITY")
        for name, digest, _ in scripts:
            cursor.execute(
                "INSERT INTO catanova_admin.migration_history(filename, sha256, provider) "
                "VALUES (%s,%s,%s)",
                (name, digest, provider),
            )
    result = verify_permissions(connection, provider=provider)
    return {"initialized": True, "verified": True, **result}


def verify_managed_schema(connection: Connection[Any], *, provider: str) -> dict[str, Any]:
    """Read-only release gate; never creates a missing schema or migration ledger."""
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT to_regclass('catanova_admin.migration_history') AS ledger")
        ledger = cursor.fetchone()
        if not ledger or ledger["ledger"] is None:
            raise MigrationError("Existing lms schema is unmanaged or missing.")
        cursor.execute(
            "SELECT filename, sha256, provider FROM catanova_admin.migration_history "
            "ORDER BY filename"
        )
        expected = [
            {"filename": name, "sha256": digest, "provider": provider}
            for name, digest in MIGRATIONS
        ]
        if cursor.fetchall() != expected:
            raise MigrationError("Migration ledger differs from the reviewed manifest.")
    return verify_permissions(connection, provider=provider)


def verify_permissions(connection: Connection[Any], *, provider: str) -> dict[str, Any]:
    """Assert private schemas, relation ACLs, RLS and a narrowly bounded trigger."""
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            "SELECT n.nspname FROM pg_namespace n, "
            "LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a "
            "WHERE n.nspname IN ('lms','catanova_admin') AND a.grantee=0"
        )
        if cursor.fetchall():
            raise MigrationError("PUBLIC has access to a private schema.")
        cursor.execute(
            "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace, "
            "LATERAL aclexplode(coalesce(c.relacl, acldefault("
            "CASE WHEN c.relkind='S' THEN 's'::\"char\" ELSE 'r'::\"char\" END, "
            "c.relowner))) a WHERE n.nspname IN ('lms','catanova_admin') "
            "AND c.relkind IN ('r','S') AND a.grantee=0"
        )
        if cursor.fetchall():
            raise MigrationError("PUBLIC has table or sequence privileges.")
        cursor.execute(
            "SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c "
            "WHERE c.relnamespace='lms'::regnamespace AND c.relkind='r' ORDER BY c.relname"
        )
        tables = cursor.fetchall()
        if len(tables) != 12 or not all(row["relrowsecurity"] for row in tables):
            raise MigrationError("Expected 12 RLS-enabled application tables.")
        cursor.execute("SELECT * FROM pg_policies WHERE schemaname IN ('lms','catanova_admin')")
        if cursor.fetchall():
            raise MigrationError("Unexpected row-level access policies.")
        cursor.execute(
            "SELECT p.proname, p.prosecdef, p.prorettype='trigger'::regtype AS trigger_only, "
            "EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) "
            "a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute "
            "FROM pg_proc p WHERE p.pronamespace='lms'::regnamespace"
        )
        functions = cursor.fetchall()
        if (
            len(functions) != 1
            or functions[0]["proname"] != "revoke_sessions_for_inactive_user"
            or functions[0]["prosecdef"]
            or not functions[0]["trigger_only"]
        ):
            raise MigrationError("Unexpected privileged or callable application function.")
        public_execute = functions[0]["public_execute"]
        if provider != "prisma" and public_execute:
            raise MigrationError("Unexpected PUBLIC function execution privilege.")
        cursor.execute("SELECT version FROM lms.schema_version ORDER BY version")
        if [row["version"] for row in cursor.fetchall()] != [1, 2, 3]:
            raise MigrationError("Application schema version mismatch.")
    return {
        "rls_tables": len(tables),
        "public_schema_access": False,
        "public_relation_access": False,
        "trigger_public_execute": public_execute,
        "separate_runtime_sql_role": False if provider == "prisma" else None,
    }
