# CataNova

**Catalog. Manage. Discover.**

CataNova is a connected library workspace for readers and library teams, built as the Python 3.14 revamp of the original C++ project. This monorepo lives in `catanova-lms/`. The legacy source remains under `legacy/`, the FastAPI application and Python CLI under `backend/`, the Next.js dashboard under `frontend/`, and shared PostgreSQL and API contracts under `supabase/` and `contracts/`.

Brand assets and design rules are documented in [BRAND.md](development-plans/BRAND.md). Existing local Supabase container IDs, `lms` database schemas, environment variable names, API routes, session cookies, and GitHub remotes are intentionally preserved. Plan 19 separately provisions Prisma PostgreSQL; branding alone does not migrate data or rename cloud resources.

## Repository structure

| Path | Responsibility |
| --- | --- |
| `backend/app/main.py` | Canonical FastAPI ASGI entry point (`backend.app.main:app`) |
| `backend/app/` | Unified application package: domain, services, repositories, API, and CLI |
| `backend/tests/` | Python unit, integration, API, and repository tests |
| `contracts/openapi.json` | Deterministic API contract shared with the dashboard |
| `frontend/` | Next.js 16 App Router dashboard with strict TypeScript, Tailwind CSS 4, and React Compiler |
| `supabase/` | Pinned, local-only PostgreSQL/Supabase configuration and migration history |
| `backend/scripts/` | Contract, deployment validation, migration, and CI classification tools |
| `scripts/` | Repository-level PowerShell developer workflows |
| `development-plans/` | Ordered implementation plans using `development-plan-xx.md` names |

## Local setup (PowerShell)

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and run this from the repository root. uv uses the pinned Python 3.14 patch in `.python-version`, creates `.venv`, and installs the locked runtime and development dependencies:

```powershell
uv sync --locked
uv run --locked python --version
```

Run the interactive CLI:

```powershell
uv run --locked lms
```

Inside the shell, run `help` to list commands. Start a new installation with `bootstrap-admin`; that command is disabled permanently after the first administrator is created. Use `register` for ordinary member accounts and `login` to begin a session. Passwords are collected through masked prompts and are not written to command history.

It can also be started as a module:

```powershell
uv run --locked python -m backend.app
```

## FastAPI foundation

The API exposes liveness and database/schema readiness endpoints. With `DATABASE_URL`
set, lifespan opens a bounded Psycopg pool and readiness verifies schema version 3.
Without that setting, liveness works and readiness returns 503. PostgreSQL business
repositories are complete under Plan 14; the CLI intentionally continues to use SQLite
until the controlled import and cutover work in later plans.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
uv run --locked --env-file .env uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

The API listens at `http://127.0.0.1:8000`; its default allowed dashboard origin is
`http://localhost:3000`. Run the command from the repository root.
`backend.app.main:app` is the Weather Glint-style entry point. Configuration
is read from environment variables; `uv run --env-file .env` explicitly loads the
root `.env` before starting Uvicorn. A missing local database leaves `/health/ready` at 503 while
`/health/live` remains available.

## Next.js dashboard

The isolated frontend requires the Node/npm versions declared in `frontend/package.json` and `frontend/.nvmrc`. Use `npm.cmd` because a PowerShell execution policy can block `npm.ps1`:

```powershell
Set-Location frontend
Copy-Item .env.local.example .env.local
& "C:\Program Files\nodejs\npm.cmd" ci
& "C:\Program Files\nodejs\npm.cmd" run dev
```

The browser calls same-origin Next.js API routes. Server-only `BACKEND_API_URL`
selects FastAPI, and `APP_ORIGIN` selects the canonical dashboard origin; production
requires both. Leave `NEXT_PUBLIC_API_BASE_URL` empty. Database credentials never
belong in Vercel or `NEXT_PUBLIC_*` variables. Tailwind CSS is connected through
`@tailwindcss/postcss`; React Compiler is enabled in `frontend/next.config.ts` with
its compiler package locked in `frontend/package-lock.json`.

## Local PostgreSQL

### Prisma hosted development

[Plan 19](development-plans/development-plan-19.md) moves hosting to Prisma
Postgres, retaining FastAPI and psycopg. Production and development databases
remain separate. No production cutover is implied by the configuration below.

Both Prisma schemas have been initialized and reconciled with the empty hosted
Supabase source. That source contained no accounts, catalog items, or circulation
records. Existing migration timestamps were preserved. See the concise
[deployment guide](development-plans/DEPLOYMENT.md) for connection setup and the
provider's SQL-role limitations. Keep Supabase until public cutover is verified.

After the development database is provisioned and initialized, copy
`.env.development.example` to the ignored `.env.development` and set its private
**development** database URL. Run from the repository root:

```powershell
uv run --locked --env-file .env.development uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

Use `LMS_ENVIRONMENT=development`, not `preview`, for local HTTP with a hosted
database. This mode requires TLS for PostgreSQL and loopback API/browser settings;
`local` and `test` still reject remote databases. Production keeps HTTPS and secure
cookies. Keep browser and API on the same hostname (for example `127.0.0.1`).
In `frontend/`, start with `npm.cmd run dev -- --hostname 127.0.0.1` and visit
`http://127.0.0.1:3000`.

Pinned cloud CLIs are available through `scripts/cloud.ps1`, for example
`.\scripts\cloud.ps1 prisma auth whoami --json`. Versions live in
`deploy/cloud-toolchain.json`; this tooling does not add cloud SDKs to the backend
or frontend dependencies. Local project links and credential files are ignored.

Run `.\scripts\dev.ps1` to print both preview commands with `.env.development`.
Use `-EnvFile .env` only to select the existing local/WSL database explicitly.
Prisma development does not need Docker, Supabase CLI, or Prisma ORM.

### Existing local Supabase setup

Docker Engine in **WSL 2 Ubuntu** is sufficient; Docker Desktop is not required.
See [the optional WSL database](development-plans/DEPLOYMENT.md#optional-wsl-database), then run these commands **inside Ubuntu**, from the repository:

```bash
sudo supabase start
sudo supabase migration up --local
```

Keep FastAPI and its Python 3.14 `.venv` in Windows; connect to PostgreSQL at
`127.0.0.1:55432`. Windows `npx.cmd` and `scripts/dev.ps1 -StartDatabase` do not
automatically use the Ubuntu Docker socket.

`migration up --local` applies pending schema changes without resetting existing local
data. `db reset` is reserved for intentionally rebuilding disposable data. Application
tables live in the private `lms` schema. See `supabase/MIGRATIONS.md` for ownership and
compatibility rules.

The default application pool has zero minimum and five maximum connections, at most
ten waiting callers, and bounded connection/query/lock timeouts. `.env.example`
lists the `LMS_DB_*` settings. Pool statistics are available from `database.pool.get_stats()`;
transaction duration is logged at DEBUG and retry counts at WARNING without SQL or URLs.

## FastAPI browser API

Plan 16 exposes the existing services under `/api/v1` by capability: authentication,
accounts, catalog, circulation, finance, engagement, and insights. Run the API only after
applying PostgreSQL migrations:

```powershell
uv run --locked --env-file .env uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

Login returns an opaque `HttpOnly` session cookie and a CSRF token (also placed in the
non-`HttpOnly` CSRF cookie). Browser calls use `credentials: "include"`; every unsafe
authenticated request sends the exact CSRF value in `X-CSRF-Token`. State-changing
business routes also require a caller-generated `Idempotency-Key` of 8-200 characters.
Only hashes of session and CSRF values are stored, account deactivation revokes active
sessions, and credentialed CORS accepts only the exact origins in `LMS_ALLOWED_ORIGINS`.
The interactive contract is at `/docs`; the committed contract remains authoritative
for the generated Next.js client.

## Developer workflows

Validate prerequisites and print the API/dashboard commands:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1 -StartDatabase
```

Run the complete backend, contract, frontend, and production-build gate:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

To include the real PostgreSQL suite after starting Supabase:

```powershell
$env:LMS_TEST_POSTGRES_ADMIN_URL = 'postgresql://postgres:postgres@127.0.0.1:55432/postgres'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check.ps1 -Postgres
```

The suite creates a random `lms_test_*` database, applies migrations, and drops only
that database on completion. Without the test URL these tests are explicitly skipped;
`-Postgres` requires it to be set. The CI database job always supplies it. Test creation
uses a local owner account; genuine data and hosted databases are outside the test scope.
The PostgreSQL gate also performs a native custom-format `pg_dump`/`pg_restore` drill
against a second disposable database. `scripts/check.ps1` uses the local container name
from `supabase/config.toml`; set `LMS_TEST_POSTGRES_CONTAINER` explicitly if the local
Supabase project name differs.

The process-scoped bypass is necessary on hosts that prohibit local `.ps1` files; it does not alter the machine or user execution policy. Use `-SkipFrontendBuild` only for a faster local iteration; the production build remains mandatory before completion. CI uses the same checks and a conservative path classifier, while always reporting one stable `CI` result.

## Individual quality checks

```powershell
uv run --locked python -m pytest
uv run --locked pyrefly check
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python -m backend.scripts.export_openapi --check

Set-Location frontend
& "C:\Program Files\nodejs\npm.cmd" run check
```

`uv.lock` is the authoritative Python dependency lock; there is no `requirements.txt`. Pyrefly and other development tools are in the `dev` dependency group. In `frontend/`, run `npm.cmd run format` to apply Prettier or `npm.cmd run format:check` to verify formatting.

## CLI appearance

The application provides its own color theme, styled output, interactive history, and a PowerShell-like prompt. Font selection belongs to the terminal host and cannot be changed reliably by a Python process.

## SQLite migration and PostgreSQL recovery

Plan 15 provides `scripts/data-migration.ps1` for validated snapshot creation, inspection,
dry-run or committed fresh-target import, custom-format logical backup verification, and
guarded restore. Import is dry-run by default and `--commit` is explicit. It preserves
identifiers, repairs PostgreSQL sequences, compares every table using canonical row
digests, and reconciles circulation and minor-unit financial totals before commit.

The current milestone is synthetic rehearsal only: do not import the working SQLite
database or discard any source/backup. Follow the complete preconditions, command order,
credential handling, off-provider storage, rollback contract, and restore checks in
`supabase/DATA_MIGRATION.md`.

For the intended appearance, use Windows Terminal and select a monospace font such as Cascadia Mono or Cascadia Code in the terminal profile used to launch the application. The CLI remains usable when color or Unicode support is unavailable.

## Current catalog commands

After signing in, use `books [query]`, `book <id>`, and `copies <book-id>` to browse the catalog. Librarians and administrators can use `add-book`, `update-book <id>`, `add-copy <book-id> [barcode]`, and `copy-status <barcode> <status>` to manage inventory. Run `help` inside the application for the complete command list.

## Current circulation commands

Members can use `reserve <book-id>`, `reservations`, `cancel-reservation <id>`, `loans`, and `renew <loan-id>` to manage their reservations and loans. Librarians and administrators can use `checkout <username> <barcode>` and `return-copy <barcode>`, inspect another account with `loans <username>`, and cancel reservations for other users. Reservation queues are first-in, first-out, and checkout, renewal, and return policies are enforced transactionally.

## Current financial commands

Members can use `fines` and `fine <id>` to inspect their own fine history and outstanding balance. Librarians and administrators can use `fines <username>`, `assess-fine <username> <amount>`, and `pay-fine <id>` to manage charges and record full payments. Administrators can use `waive-fine <id>` to waive an outstanding fine with a recorded reason.

The overdue rate is currently PKR 10.00 per started day. Returning an overdue copy creates its fine in the same database transaction that closes the loan and restores copy availability. Amounts are persisted as integer minor units, and payments and waivers retain immutable settlement records.

## Current engagement commands

Members can use `request-book`, `requests [status]`, `submit-feedback`, and `feedbacks [status]` to submit and inspect their own acquisition requests and feedback. Librarians and administrators can review all submissions with `review-request <id> <approved|rejected>`, `acquire-request <request-id> <book-id>`, `review-feedback <id>`, and `archive-feedback <id>`.

Duplicate pending requests from the same member are rejected case-insensitively. Approved requests can be linked to an existing catalog record when acquired, while feedback follows a retained `new` → `reviewed` → `archived` lifecycle.

## Current insights commands

Authenticated users can run `recommend [limit]` for explainable, personalized suggestions and `popular [limit]` for the most-circulated books that currently have an available copy. Recommendations use borrowing-history category and author affinity, historical checkout popularity, availability, and deterministic tie-breaking while excluding previously borrowed titles.

Librarians and administrators can run `dashboard` for current account, catalog, copy, loan, reservation, fine, acquisition-request, and feedback workload metrics, followed by the five most-circulated available books. Reporting is read-only and calculated directly from persisted operational data.

## Current maintenance commands

Administrators can run `db-health` to check SQLite integrity, foreign keys, schema compatibility, circulation consistency, and financial settlement consistency. Use `backup` to create an online, validated snapshot and `backups` to inspect managed backup health and compatibility.

Use `restore-backup <filename>` to restore a listed backup after entering the explicit `RESTORE` confirmation phrase. Restore candidates are restricted to the application's `backups` directory, must pass current-schema health validation, and are staged before atomic replacement. A validated `pre-restore` safety backup is created automatically before the live database is replaced.

## Password security

Passwords are handled with Argon2id through `argon2-cffi`. Plaintext passwords must never be persisted or logged. The password service also supports replacing a valid hash when its security parameters become outdated.

## Project status

The CLI remains available alongside the role-aware Next.js dashboard and FastAPI
backend. Plan 19 initialized isolated Prisma development/production databases and
reconciled the empty Supabase source, preserving its migration timestamps. Local
real-browser read/write, persistence, concurrency, HTTPS cookies and CSRF checks
passed. Same-origin API relay and manual exact-commit production release/backup
workflows are implemented. PR #2 is merged; the owner-created production
administrator, Git-connected hosting, live Render readiness, encrypted GitHub
backup and real disposable restore checks are verified. The public frontend
release is pending the monorepo workflow correction's manual PR merge and final
hosted browser checks. The team-scoped Vercel CI token is accepted; the dashboard
domain is `https://catanova.vercel.app`. Supabase is untouched. See Plan 19 for
current execution evidence.
The owner-capable Prisma credential does not reproduce isolated runtime SQL roles;
see Plan 19 before exposing production. Local tests are not public capacity or
hosted disaster-recovery evidence.

## Deployment readiness

Validate the committed provider and secret boundaries without contacting a provider:

```powershell
uv run --locked python -m backend.scripts.validate_deployment
```

The [deployment guide](development-plans/DEPLOYMENT.md) covers Prisma connections,
masked owner administrator setup, Render/Vercel configuration, and the manual
**Deploy production** workflow. The workflow requires successful CI on the exact
current `main` commit and a protected GitHub `production` environment. Merge from
`pre-production` through your reviewed PR first. Remaining hosted release gates
are tracked in [Plan 19](development-plans/development-plan-19.md).
