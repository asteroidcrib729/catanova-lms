# CataNova deployment

Stack: **Prisma Postgres → Render FastAPI → Vercel Next.js**.
Run PowerShell commands from the repository root; stop on errors.

Production verified on 2026-10-18: <https://catanova.vercel.app>, commit `9a5cf1a`.
Database, backend, frontend, real-browser writes/security and backup/restore passed.
The steps below are for connection setup, recreation and future releases.

## 1. Database connections

The Prisma project `catanova-lms` already contains two Singapore databases:

| Use | Database | Branch | `LMS_ENVIRONMENT` |
| --- | --- | --- | --- |
| Local preview | `catanova-development` | `development` | `development` |
| Production | `catanova-production` | `main` | `production` |

Both schemas are initialized. Supabase contained no business records; its three
migration timestamps were preserved in production. After verified public cutover,
the owner authorized deletion of the old hosted Supabase project on 2026-10-18.
Deletion and continued production health were verified. The owner subsequently
requested removal of legacy local data and old exports/backups; only the fresh
current-deployment recovery archive and its decryption identity are retained.

In [Prisma Console](https://console.prisma.io/), select the correct database →
**Connect to your database**. Use the standard PostgreSQL **direct** URL:

```dotenv
DATABASE_URL=postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require
```

Keep the direct endpoint: the backend uses session settings and its own bounded
pool. Do not use `prisma://` or place credentials in frontend variables.
Prisma ORM is not required.

## 2. Local preview

```powershell
uv sync --locked
if (-not (Test-Path .env.development)) { Copy-Item .env.development.example .env.development }
```

`.env.development` is already configured on this machine. Elsewhere, set its
**development** database URL and:

```dotenv
LMS_ENVIRONMENT=development
LMS_API_HOST=127.0.0.1
LMS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
LMS_DB_POOL_MAX=3
```

Start FastAPI:

```powershell
uv run --locked --env-file .env.development uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

In another terminal:

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1
```

Visit `http://127.0.0.1:3000`. Require `status: ready` at
`http://127.0.0.1:8000/health/ready`. Use **First setup** to create your own first
administrator in development only. Production uses the masked owner command
below. Synthetic verification accounts are removed afterward.

`.\scripts\dev.ps1` prints both commands. No Docker is needed for Prisma preview.
The obsolete WSL `.env` and local stack were deleted at the owner's request.

## 3. Schema management and security

Historical SQL remains unchanged in `supabase/migrations`. Do not run Supabase
migrations against Prisma. The reviewed adapter pins checksums and verifies
permissions before commit; API startup never migrates the schema.

For an empty development target, rehearse, then commit explicitly:

```powershell
uv run --locked --env-file .env.development python -m backend.scripts.database initialize --provider prisma --environment development
uv run --locked --env-file .env.development python -m backend.scripts.database initialize --provider prisma --environment development --commit
```

Managed schemas are verified, not replayed; unmanaged schemas and edited SQL are
rejected. Future schema changes require new reviewed migrations. The optional
empty-source restore rejects populated sources; those require a separately verified
consistent dump/restore.

**Permission difference:** Prisma credentials cannot create roles or run
`GRANT`/`REVOKE`. They do not reproduce migration/runtime SQL-role isolation.
RLS remains enabled, but the owner connection can bypass it; application
authorization is essential. PUBLIC cannot access private schemas/tables/sequences.
The invoker-only trigger function retains default EXECUTE inside the inaccessible
schema. Treat backend credentials as privileged secrets.

## 4. Production database: owner setup

Do this **before exposing the backend**. Hosted browser bootstrap is deliberately
forbidden to prevent a visitor from claiming the first administrator account.

```powershell
if (-not (Test-Path .env.production)) { Copy-Item .env.production.example .env.production }
```

Privately edit the ignored `.env.production`: keep `LMS_ENVIRONMENT=production`
and enter the **production direct PostgreSQL URL**. Never paste it into chat.
Then run:

```powershell
# Existing terminal variables take priority over uv's env file.
Remove-Item Env:LMS_ENVIRONMENT, Env:DATABASE_URL -ErrorAction SilentlyContinue
uv run --locked --env-file .env.production python -m backend.scripts.database verify --provider prisma --environment production --confirm-production
uv run --locked --env-file .env.production python -m backend.scripts.bootstrap_administrator --environment production --confirm-production
uv run --locked --env-file .env.production python -m backend.scripts.database verify --provider prisma --environment production --confirm-production --require-administrator
```

Choose your own display name, username and password at the terminal prompts.
Password input is masked; no password belongs in command arguments or Git.
The one-time setup closes once an administrator exists. Do not rerun initialization
or restore over these already initialized databases.

### Access administrator features

Open <https://catanova.vercel.app> and sign in with the **production administrator
username and password created during owner setup**. The role-aware dashboard at
`/dashboard` automatically includes **Accounts** and staff controls. There is no
separate `/admin` login or default admin password. If signed in as a member,
sign out first; registering another account does not grant administrator rights.
One active production administrator was verified. Forgotten credentials require
a separate private owner-assisted reset, not rerunning first setup.

## 5. Connect hosting after the reviewed PR merge

The owner merged PR #3; stable CI and release passed for `9a5cf1a`. Resources are
created and Git-connected (identities in
[`deploy/hosting-resources.json`](../deploy/hosting-resources.json)). Backend:
`https://catanova-api.onrender.com`; dashboard: `https://catanova.vercel.app`.
Keep automatic releases disabled and use the gate below for future releases.
The following records the verified setup for recreation:

1. Reserve the Vercel project `catanova-lms` in the confirmed account. Connect
   `asteroidcrib729/catanova-lms`, branch `main`, root `frontend`,
   Node 24, install `npm ci`, build `npm run build`. Keep Git-triggered automatic
   deployments disabled so releases use the gate below. Note its canonical HTTPS
   production origin; this becomes `APP_ORIGIN`.
2. Use the existing Render **My Workspace** service, created with MCP/CLI from
   the reviewed `render.yaml` settings (not a managed Blueprint). Do not create a
   duplicate Blueprint/service. It selects **Singapore**, free Python/uv,
   one instance, pool maximum 3, and `/health/ready`. Automatic deployment stays
   off. Supply the production `DATABASE_URL` and set `LMS_ALLOWED_ORIGINS` to
   the **exact Vercel production origin** (no path or trailing slash).
3. In Vercel's **Production** environment set server-only `BACKEND_API_URL` to
   the HTTPS Render origin and `APP_ORIGIN` to the canonical HTTPS dashboard
   origin. Leave `NEXT_PUBLIC_API_BASE_URL` empty or unset. Never add a database
   URL to Vercel. Preview deployments must not use the production backend or
   production credentials; leave them unconfigured until separately isolated.
4. The browser calls its own `/api/v1/...` and `/health/...`; Next.js forwards
   to FastAPI. Host-only Secure/HttpOnly session cookies stay on the dashboard.
   Do not add a cookie Domain, wildcard origins, or disable CSRF checks.

For this first setup, the provider's initial build may run before all environment
values are supplied; it is not a verified release. Keep the app unused until
the gated deployment and checks below succeed.

## 6. Gated release

Create GitHub environment **production** (add required reviewers if available).
Configure these values there; the complete contract is
[`deploy/environment-contract.json`](../deploy/environment-contract.json).

| Type | Names / values |
| --- | --- |
| Secrets | `PRODUCTION_DATABASE_ADMIN_URL` (direct URL), `PRODUCTION_SMOKE_PASSWORD` (owner-provisioned account), `RENDER_DEPLOY_HOOK`, `VERCEL_TOKEN` |
| Variables | `PRODUCTION_API_BASE_URL` (Render origin), `PRODUCTION_WEB_BASE_URL` (canonical dashboard origin), `PRODUCTION_SMOKE_USERNAME`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |

Use a dedicated ordinary member account for repeatable smoke checks when
available. Smoke checks sign in/out and verify session security; they do not
create catalog or circulation records. Keep the Vercel token scoped to the
owning team, `farazhussain-5000's projects`, and keep the Render deploy hook
private. The current CLI pull/build workflow requires user/team lookups that
fail with project-only tokens; use an expiring team-scoped personal access token,
not full-account access. Team scope grants access beyond this single project.

If Vercel rejects the CI token, run `./scripts/set-vercel-ci-token.ps1 -Publish`
from the repository root in your own terminal. Paste the actual token value at
the hidden prompt, not its name. The helper checks identity and CataNova project
access before saving that same value to GitHub production; it never deploys.

In GitHub **Actions → Deploy production → Run workflow**, select `main`, supply
the full current `main` SHA and confirmation `DEPLOY-PRODUCTION`. The workflow:

1. Requires the exact current `main` commit and a successful stable `CI` result.
2. Verifies the existing Prisma schema **read-only** and requires an administrator.
3. Deploys that exact backend commit and checks readiness plus reported revision.
4. Builds/deploys the same frontend checkout and runs authenticated same-origin
   smoke checks, retaining redacted evidence for seven days.

The Vercel CLI steps run from the **repository root**. Keep the provider's Root
Directory set to `frontend`; running the CLI inside frontend applies that path
twice. The correction is merged and verified. For future changes, wait for main
CI and start a fresh release for the new main SHA, not an old failed run.

After each release, verify sign-in, protected writes, reload and logout in a real
browser. These public checks passed on 2026-10-18, including concurrent retries,
role/CSRF/origin boundaries and database persistence. The old hosted Supabase
project is deleted; recovery requires a current backup, not resuming
that project. Reconcile any new writes before switching databases.

**Backups:** configure `BACKUP_AGE_RECIPIENT` in the same GitHub environment and
run **Backup production** with `BACKUP-PRODUCTION`. It encrypts a PostgreSQL 17 archive of `lms` and
`catanova_admin`; retain the decryption identity separately and copy backups to
private off-provider storage. Seven-day artifacts alone are not a retention
policy or evidence of a successful restore drill.

An earlier full disposable restore rehearsal passed on 2026-10-18. After the
owner's cleanup request, old backups/exports and local WSL data were removed.
The replacement [backup run 39140350724](https://github.com/asteroidcrib729/catanova-lms/actions/runs/39140350724)
contains the current production revision `9a5cf1a`. Its encrypted archive/checksum
are retained under `.dev-processes/recovery/current-39140350724/` and in GitHub
artifact `12141282814`. Checksum, authenticated decryption and PostgreSQL archive
catalog checks passed; this replacement was not given a new full restore drill.
No decrypted archive was written to disk. Its decryption identity is in
`production-age-key.txt`, restricted to the current Windows account. Store that
identity separately in a private password manager/offline location, and keep a
separate encrypted backup copy off this computer. Never upload the identity to
GitHub. `BACKUP_AGE_RECIPIENT` contains only the public encryption recipient.

See [development-plan-19.md](development-plan-19.md) for release evidence and
ongoing operating responsibilities. The free Render service can cold-start;
do not automatically replay writes when a warm-up request times out.

## Local database status

The legacy WSL stack and volume, SQLite CLI data and legacy text data are deleted.
Use Prisma development through `.env.development`; Docker is not needed for
preview. Retained historical SQL is still required by the Prisma migration adapter
and disposable CI tests. Do not delete migration source files with old data.
