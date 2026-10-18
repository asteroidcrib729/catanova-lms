# Development Plan 20: Provider-neutral database source

## Objective and scope

Separate CataNova's active PostgreSQL source from its former Supabase hosting
layout. Prisma Postgres remains the production and development provider; FastAPI,
psycopg, public endpoints and application behavior stay unchanged.

This is a repository restructure, not a database migration or deployment.
Do not contact hosted databases, replay SQL, recreate deleted legacy data, modify
private credentials or discard the latest retained recovery material.

## Execution

- [x] Move the three immutable SQL files from `supabase/migrations/` to
  `database/migrations/`, preserving their bytes, names, timestamps and checksum pins.
- [x] Move migration/import/recovery runbooks into `database/` and correct their
  links, provider assumptions and ledger-backup documentation.
- [x] Isolate optional CLI configuration, version pin, seed placeholder and ignore
  rules under `database/local/supabase/`. Remove the empty root `supabase/` folder.
- [x] Name the optional test project `catanova-test`; disable CLI migrations and
  seeds. No SQL copies or symlinks: Python fixtures apply the canonical files.
- [x] Centralize the shared SQL path in `MIGRATIONS_DIRECTORY` and update the
  explicit initializer, PostgreSQL fixtures and checksum tests.
- [x] Update CI classification, CLI `--workdir`, backup-test container defaults,
  current README and deployment guide. Preserve earlier plans as historical evidence.
- [x] Validate lint, formatting, typing, unit/API tests, contract checks, workflow
  syntax, script parsing, source hashes and real disposable PostgreSQL behavior.

## Verification and delivery

Validated locally on 2026-10-18:

- Windows Python 3.14: **193 unit/API tests passed**, no pytest cache warnings in
  the final run; Ruff lint/format and Pyrefly passed (0 type errors).
- Windows against the isolated WSL engine: **30 PostgreSQL tests passed**, with
  the native Docker recovery test explicitly skipped because Windows has no Docker CLI.
- WSL Python 3.14.4 with locked runtime/test dependencies in a temporary Linux
  environment: **224 tests passed, none skipped**, including real PostgreSQL
  concurrency, both provider adapters' initialization/rollback/repeat verification,
  browser API security and native custom-archive backup/restore.
- Supabase CLI **2.116.0** successfully started the relocated configuration using
  `--workdir database/local`. Before/after testing, the base `postgres` database
  had no `lms` or `catanova_admin` schemas; generated test databases were removed.
- All three original raw SHA-256 hashes still match the reviewed migration pins;
  no SQL contents, filenames or ledger identifiers changed.
- OpenAPI export, generated frontend API client, deployment contracts, actionlint
  1.7.12, PowerShell parsing, developer-helper preview, documentation links,
  ignored CLI state and whitespace checks passed.

No production deployment was part of this directory-restructure validation;
no cloud write or hosted database connection was performed in that phase.
The subsequent user-authorized Git delivery and release verification are tracked
in [Plan 21](development-plan-21.md).
The latest encrypted production backup, private identity and release evidence
were preserved. The isolated test stack and temporary test environments are
removed after validation; deleted legacy databases are not recreated.

## Operator impact

Normal preview is unchanged: use `.env.development` with the separate Prisma
development database. For optional local PostgreSQL tests, use
[`database/README.md`](../database/README.md#optional-postgresql-tests).
Existing hosted schemas and private migration ledgers do not need updating when
the source path changes. Initialization remains explicit and dry-run by default.
