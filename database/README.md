# Database source

CataNova uses **Prisma Postgres** for separate production and hosted development
databases. FastAPI connects with psycopg; Prisma ORM is not used.

| Path | Purpose |
| --- | --- |
| `migrations/` | One canonical, checksum-pinned SQL history shared by Prisma initialization and PostgreSQL tests |
| [MIGRATIONS.md](MIGRATIONS.md) | Schema ownership, initialization and compatibility rules |
| [DATA_MIGRATION.md](DATA_MIGRATION.md) | Guarded SQLite import and PostgreSQL recovery procedures |
| `local/supabase/` | Optional, isolated PostgreSQL test engine configuration; not a hosted project connection |

For normal preview and production connections, follow the
[deployment guide](../development-plans/DEPLOYMENT.md). Docker and Supabase CLI
are **not** required for hosted Prisma development.

## Optional PostgreSQL tests

The retained Supabase CLI stack provides PostgreSQL 17 only. No application SQL
or seed data is replayed by the CLI. Python fixtures apply `database/migrations/`
to uniquely named `lms_test_*` databases, then drop only those databases.
The base `postgres` database remains outside the fixture migration target.

In **WSL Ubuntu**, from the repository root with Docker Engine running, use the
native Linux Supabase CLI at the version in `local/supabase/CLI_VERSION`:

```bash
sudo supabase start --workdir database/local
```

If your Docker socket requires no sudo, omit it. Windows `npx.cmd` does not
automatically use the Ubuntu socket; Docker Desktop is unnecessary.
CI uses the pinned CLI with the same `--workdir database/local` argument.
The CLI can publish ports on `0.0.0.0`; keep this disposable stack behind your
local firewall/WSL boundary, never expose it to the internet, and never store
genuine records in it. Its default local credentials are not production secrets.

In **Windows PowerShell**, from the repository root:

```powershell
$env:LMS_TEST_POSTGRES_ADMIN_URL = 'postgresql://postgres:postgres@127.0.0.1:55432/postgres'
Remove-Item Env:LMS_TEST_POSTGRES_CONTAINER -ErrorAction SilentlyContinue
uv run --locked python -m pytest backend/tests/postgres -q
```

Only loopback URLs are accepted. Windows can run the database/API/concurrency
tests across WSL localhost; the native Docker recovery test is explicitly skipped
when its container setting is absent. That test invokes `docker` directly, not
through an automatic Windows-to-WSL bridge.

For the **complete suite including backup/restore**, run in Ubuntu with Linux uv,
Python 3.14 and Docker access, or use the CI database job. Keep the Linux test
environment separate from the Windows `.venv`:

```bash
sudo env UV_PROJECT_ENVIRONMENT=/tmp/catanova-test-venv \
  LMS_TEST_POSTGRES_ADMIN_URL=postgresql://postgres:postgres@127.0.0.1:55432/postgres \
  LMS_TEST_POSTGRES_CONTAINER=supabase_db_catanova-test \
  uv run --locked python -m pytest backend/tests/postgres -q
```

Use the absolute Linux uv path after `env` if sudo's PATH does not include it.
`scripts/check.ps1 -Postgres` is the full PowerShell gate only when a Docker CLI
that reaches this engine is also available in Windows.

To stop this optional stack in Ubuntu:

```bash
sudo supabase stop --workdir database/local
```

There are no credentials, application records, production backups or hosted
project links in this tracked directory. Never link this test stack to a cloud
project or run `db push`/`db reset` against Prisma. Do not copy SQL into a second
`supabase/migrations/` directory. Historical plans retain their original paths;
[Plan 20](../development-plans/development-plan-20.md) records this relocation.

Configuration reference: [Supabase CLI config](https://supabase.com/docs/guides/local-development/cli/config).
