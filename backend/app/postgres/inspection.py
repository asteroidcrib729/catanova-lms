"""Non-disclosing schema reconciliation for the verified empty hosted source."""

from __future__ import annotations

from typing import Any

from psycopg import Connection, sql
from psycopg.rows import dict_row

from backend.app.postgres.migrations import MigrationError

TABLES = (
    "schema_version",
    "users",
    "books",
    "book_copies",
    "reservations",
    "loans",
    "fines",
    "fine_settlements",
    "book_requests",
    "feedback",
    "idempotency_records",
    "browser_sessions",
)

METADATA_SQL = """
SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,
   'force_rls',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='lms' AND c.relkind='r'),
 'columns',(SELECT jsonb_agg(jsonb_build_object('table',table_name,'name',column_name,
   'type',data_type,'udt',udt_name,'nullable',is_nullable,'default',column_default,
   'identity',is_identity,'generation',identity_generation) ORDER BY table_name,ordinal_position)
   FROM information_schema.columns WHERE table_schema='lms'),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,
   'name',c.conname,'definition',pg_get_constraintdef(c.oid,true),'validated',c.convalidated)
   ORDER BY c.conrelid::regclass::text,c.conname) FROM pg_constraint c
   WHERE c.connamespace='lms'::regnamespace),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,
   'definition',indexdef) ORDER BY tablename,indexname) FROM pg_indexes WHERE schemaname='lms'),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('name',t.tgname,
   'definition',pg_get_triggerdef(t.oid,true)) ORDER BY t.tgname) FROM pg_trigger t
   JOIN pg_class c ON c.oid=t.tgrelid
   WHERE c.relnamespace='lms'::regnamespace AND NOT t.tgisinternal),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]')
   FROM pg_policies p WHERE schemaname='lms'),
 'functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,
   'definition',pg_get_functiondef(p.oid),'security_definer',p.prosecdef) ORDER BY p.proname)
   FROM pg_proc p WHERE p.pronamespace='lms'::regnamespace),
 'sequences',(SELECT jsonb_agg(jsonb_build_object('name',sequencename,'start',start_value::text,
   'increment',increment_by::text,'minimum',min_value::text,'maximum',max_value::text,
   'cache',cache_size::text,'cycle',cycle,'last_value',last_value::text) ORDER BY sequencename)
   FROM pg_sequences WHERE schemaname='lms')
) AS metadata
"""


def validate_empty_source(snapshot: dict[str, Any]) -> None:
    """This initializer is deliberately NOT an importer for a populated database."""
    rows = snapshot.get("rows", {})
    if set(rows) != set(TABLES) or any(rows[name] for name in TABLES if name != "schema_version"):
        raise MigrationError("Source contains records; a full consistent dump/restore is required.")
    if [row.get("version") for row in rows["schema_version"]] != [1, 2, 3]:
        raise MigrationError("Unexpected source schema versions.")
    states = snapshot.get("sequence_states", {})
    if len(states) != 9 or any(
        state != {"last_value": "1", "is_called": False} for state in states.values()
    ):
        raise MigrationError("Source sequence state requires a full logical restore.")


def reconcile_empty_source(connection: Connection[Any], snapshot: dict[str, Any]) -> None:
    """Preserve version timestamps and compare all recorded schema/data contracts.

    Called within the same transaction as initial schema creation. Any mismatch
    aborts the entire operation. Never execute SQL supplied by snapshot contents.
    """
    validate_empty_source(snapshot)
    with connection.cursor(row_factory=dict_row) as cursor:
        for row in snapshot["rows"]["schema_version"]:
            cursor.execute(
                "UPDATE lms.schema_version SET applied_at=%s WHERE version=%s",
                (row["applied_at"], row["version"]),
            )
        cursor.execute(METADATA_SQL)
        result = cursor.fetchone()
        if not result:
            raise MigrationError("Could not inspect target schema.")
        for section, actual in result["metadata"].items():
            if actual != snapshot.get(section):
                raise MigrationError(f"Target schema differs from source: {section}.")
        for name in TABLES:
            cursor.execute(sql.SQL("SELECT count(*) AS n FROM lms.{}").format(sql.Identifier(name)))
            count = cursor.fetchone()
            if not count or count["n"] != len(snapshot["rows"][name]):
                raise MigrationError("Target row counts differ from source.")
        cursor.execute(
            "SELECT jsonb_agg(to_jsonb(v) ORDER BY version) AS versions FROM lms.schema_version v"
        )
        versions = cursor.fetchone()
        if not versions or versions["versions"] != snapshot["rows"]["schema_version"]:
            raise MigrationError("Source version timestamps were not preserved.")
        for name, expected in snapshot["sequence_states"].items():
            # name must also exist in the fixed reviewed target metadata above.
            cursor.execute(
                sql.SQL("SELECT last_value::text AS last_value,is_called FROM lms.{}").format(
                    sql.Identifier(name)
                )
            )
            if cursor.fetchone() != expected:
                raise MigrationError("Target sequence state differs from source.")
