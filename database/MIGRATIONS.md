# PostgreSQL migrations

`database/migrations/` is the single SQL source of truth:

| File | Application schema version |
| --- | --- |
| `20260905000100_initial_lms.sql` | 1: initial private `lms` schema |
| `20260905000200_idempotency_claims.sql` | 2: atomic idempotency claims |
| `20260906000100_browser_sessions.sql` | 3: browser sessions and revocation |

These applied migrations are immutable. Their filenames, timestamps, checksums
and SQL bytes were preserved when moved from `supabase/migrations/` in Plan 20.
Future schema changes require a new reviewed, timestamped migration and an
explicit extension of the migration runner, ledger and compatibility tests;
adding a file alone does not upgrade an existing database.
Dashboard-only schema changes are prohibited. API startup never migrates.

## Prisma and ordinary PostgreSQL

`backend.app.postgres.migrations.MIGRATIONS_DIRECTORY` resolves the shared path
independently of the shell's working directory. The explicit owner-run
`backend.scripts.database` command verifies checksum pins and the private
`catanova_admin.migration_history`; `lms.schema_version` is the API compatibility
marker. Managed schemas are verified, not replayed. Unmanaged targets and edited
migration SQL fail closed. Initialization is atomic, advisory-locked and dry-run by default.

For Prisma initialization and read-only verification commands, use
[DEPLOYMENT.md](../development-plans/DEPLOYMENT.md#3-schema-management-and-security).
The Prisma adapter omits only six reviewed, unsupported historical ACL
statements; it preserves RLS and never suppresses arbitrary SQL errors. Prisma's
owner-capable credentials cannot reproduce migration/runtime SQL-role isolation.
Treat them as privileged secrets; application authorization remains essential.

Ordinary PostgreSQL keeps the original ACL statements. Application tables live
in the private `lms` schema with RLS and no public policies. Constraints enforce
row invariants and uniqueness; cross-row circulation/financial rules additionally
use repository transactions and canonical row locks.

## Disposable tests and recovery

The optional stack under `database/local/supabase/` supplies a PostgreSQL engine
only, with CLI migrations and seeds disabled. Fixtures create unique databases,
apply the shared SQL there, and remove only databases they created. They never
reset the working or hosted databases. See [test commands](README.md#optional-postgresql-tests).

For fresh-target SQLite imports and logical backup/restore, follow
[DATA_MIGRATION.md](DATA_MIGRATION.md). Production and hosted development
credentials, backups and state are separate from this source directory.
