# Development plan 19: Prisma Postgres and Git-backed production deployment

Started: 2026-10-18. Status: database migration and Prisma-backed local preview
verified; same-origin HTTPS authentication and production release tooling
implemented. PR #2 is merged; the production administrator, hosting connections,
verified Render readiness and encrypted backup/restore are complete. Public
frontend release and final hosted browser verification remain pending. The team-
scoped CI token now works; the monorepo build-directory correction needs the
owner's PR merge before a new exact-main release.
Supabase is still intact; do not delete it yet.

## Execution record

- Installed and ran the pinned Prisma, Vercel, and Render CLIs. Render's Windows
  archive passed the official release SHA-256 check. Browser logins completed
  for all three. Subsequent authenticated identity/workspace/project reads passed.
- Verified Render CLI identity and selected the user-confirmed My Workspace.
  Verified Vercel CLI identity and confirmed this frontend is not linked to an
  unrelated project. Vercel/Render hosting resources have not been created yet.
- Created Prisma project `proj_p24w3977cbln8cturoydgvbd` (`catanova-lms`) and two
  databases in Singapore. Production is on `main`; development is on its own
  `development` preview branch. Non-secret identities are recorded in
  `deploy/prisma-resources.json`. Neither branch has a Prisma Compute deployment.
- Production database: `db_fp0s0xaloh3qrg8ctkts1ulr`; development database:
  `db_sh3a8vgj08fzh04fw7bzxqtt`. Both report ready and accepted read-only TLS
  connections using PostgreSQL 17.2. The supplied credentials cannot create roles.
- Captured one-time credentials into ignored local records and configured the
  separate ignored `.env.development` with the direct TLS endpoint. Never print
  or commit these files. Initial readiness was false before schema creation;
  the completed adapter and current live preview now pass readiness.
- Added `scripts/cloud.ps1` and `deploy/cloud-toolchain.json` for repeatable CLI
  invocation without cloud SDKs in application runtime dependencies.
- Ignored `.prisma/` links and added `.env.development.example`. Added explicit
  `development` mode for a hosted PostgreSQL development database with TLS and
  local HTTP/loopback settings. Local/test isolation and production HTTPS/secure
  cookies remain unchanged. Existing `.env` was not overwritten.
- Validation: 25 focused configuration tests passed; the full non-PostgreSQL
  suite passed **160 tests**, with 29 PostgreSQL tests deselected. Pyrefly reported
  zero errors. The initial full test attempt encountered an unrelated Windows
  temp-directory permission problem; rerunning with a fresh, repository-local
  temporary directory passed. No test data or old temp directories were deleted.
- Supabase tools subsequently became available in this chat. Authenticated project
  discovery and read-only SQL against `bchhpwjemniojkerozfm` succeeded. Its name is
  `library-management-system`, status `ACTIVE_HEALTHY`, PostgreSQL 17.6.

### Completed database migration and live preview verification

- Exact source counts: **zero rows in all 11 business/session tables**, plus
  three `schema_version` rows. Supabase Auth users and Storage objects also have
  zero rows. The observed extra database worker was idle `pg_net`, not an LMS
  application writer. No source grants, policies, data, or configuration changed.
- Captured a single-statement consistent JSON source extract containing schema
  metadata and every application row (only version rows existed). Separate
  sequence-state inspection confirmed all nine identities remained unused.
  Saved the extract privately at `.dev-processes/supabase-source-20261018.json`,
  with SHA-256 `1efe1aceecd5f690638585f6ca1c06ba85b94d3a236ce02c0c04ab9629d42130`
  and a sidecar checksum. This is an empty-source logical extract, **not** a
  general-purpose `pg_dump` archive. It contains no business records or credentials.
- Added `backend/app/postgres/migrations.py`, `inspection.py`, and the explicit
  operator command `python -m backend.scripts.database`. Historical migration
  SQL remains byte-unchanged; canonical-LF SHA-256 pins protect its contents.
  Prisma adaptation omits exactly six individually reviewed ACL statements,
  never arbitrary grants/errors. Ordinary PostgreSQL retains those statements.
- Added an RLS-enabled private `catanova_admin.migration_history` ledger. Whole
  initialization/reconciliation runs in one transaction with an advisory lock.
  Rehearsals roll back; `--commit` is explicit. Existing unmanaged schemas,
  unexpected history, populated source extracts, and advanced source sequences
  are rejected rather than overwritten or partially imported.
- Rehearsed, then committed development and production initialization separately.
  Both matched all **88 columns, 79 constraints, 43 indexes, 12 application
  tables, one trigger, one function, and nine sequences**. RLS stays enabled.
  Source versions 1–3 and their original application timestamps were preserved.
  No production synthetic accounts or catalog records were inserted.
- Verified no PUBLIC schema/table/sequence access. Prisma still cannot create
  roles or change ACLs: backend credentials have owner capabilities, **not**
  isolated DML-only runtime privileges. The invoker-only, trigger-only function
  retains default PUBLIC EXECUTE inside the inaccessible private schema. It is
  not SECURITY DEFINER. This is a documented security-model difference, not an
  assertion of equivalent SQL-role isolation. Keep that limitation visible
  before public cutover; never put the credential in browser configuration.
- Live FastAPI `/health/ready` returned HTTP 200 and `status: ready` against the
  actual Prisma development database. Real Chrome sign-in and dashboard reads
  passed with no mocked API/database. The first write found a pre-existing CSRF
  cookie-path bug; changing only the readable CSRF cookie to `Path=/` fixed it.
  The session remains HttpOnly, and Origin/digest validation remains enforced.
  Logout clears both current and legacy CSRF-cookie paths.
- Real-browser protected catalog creation, read-after-write, page reload, and
  persistence after an actual backend restart passed. Two simultaneous requests
  with the same idempotency key returned HTTP 201 and the same single record ID.
  Synthetic fixtures use a run-specific marker and scoped cleanup, never TRUNCATE
  or a schema reset. No source or production records were used for these tests.
- `scripts/dev.ps1` now prints Prisma-first `.env.development` commands without
  probing Docker. Explicit `-EnvFile .env` retains optional WSL/local preview.
  The original `.env` and local database records remain untouched. Updated README
  and the concise `DEPLOYMENT.md` to describe the new database connections.
- Additional Prisma MCP production audit was approved and executed. It sees
  schema metadata but no version/ledger rows, so its data-visibility result is
  inconclusive, not evidence that the committed rows are absent. A separate
  read-only query through each provisioned connection confirmed SQL identity
  `prisma_migration`, inactive owner RLS filtering, all three original version
  timestamps and three ledger rows. A plugin-role diagnostic requested approval
  `zetj7ujo0g90dm3w1g8q2vsh`; do not bypass that pending request or claim its
  explanation has been verified. No permission changes were made to expose data.
- Final backend validation: **169 passed**, 29 loopback-only PostgreSQL tests
  deselected; migration/API lint passed and Pyrefly reported zero errors.
  Real hosted browser/read/write/concurrency/restart checks ran separately.
  Final source recheck still found zero business records and the same timestamps.
  Removed only this run's marked synthetic development records; identity sequences
  are intentionally not reset. Both targets retain only the original version
  rows and migration ledger after cleanup. Temporary preview servers are stopped
  after verification; credentials/source extract remain ignored and private.
- Frontend validation: **39 tests in 13 files passed** with
  `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism`.
  The original default-fork invocation timed out before running tests; a
  single-fork retry also stalled. Switching to a single thread completed in
  117.68 seconds, without changing application/test configuration or weakening
  assertions. Only the identified stalled processes from this run were stopped.
  The successful thread run exited zero. Real Chrome verification also passed.

### Same-origin HTTPS and release-hardening iteration

- Added a Node-runtime Next.js relay for only `/api/v1/...` and the two health
  checks. The browser now uses its own origin, avoiding cross-site cookie
  restrictions between Vercel and Render. Fixed, validated server-only
  `BACKEND_API_URL` and `APP_ORIGIN` are required in production. No database
  credential is passed to Vercel or the browser.
- The relay bounds bodies to 64 KiB and upstream time to 18 seconds, forwards
  only reviewed headers and library cookies, prohibits redirects/domain-scoped
  upstream cookies, never caches responses, and never automatically replays a
  write. It preserves independent Secure/HttpOnly/SameSite cookie headers,
  caller idempotency keys and original Origin/CSRF enforcement. An HTTPS test
  exposed Next's internal origin reconstruction; explicit canonical APP_ORIGIN
  fixes it without trusting arbitrary forwarded-host headers.
- Disabled public first-administrator bootstrap in preview/production and hide
  its production dashboard tab. Added the masked terminal-only
  `backend.scripts.bootstrap_administrator` command, production confirmation,
  environment checks and schema readiness guard. No genuine production account
  was invented: the owner must choose credentials privately before public use.
- Added read-only `database verify` and an administrator-presence release gate.
  Migrating on server startup remains forbidden. Recovery archives now include
  the private migration ledger; restore refuses existing namespaces and uses a
  single transaction. A hosted restore drill is still separate pending evidence.
- Replaced staging release/backup workflows with protected, manual production
  workflows. Release requires successful stable CI and the exact current main
  SHA, deploys that backend ref, waits for its readiness **and revision**, then
  deploys a prebuilt frontend from the same checkout. Database secrets are scoped
  only to verification, not frontend build steps. Smoke checks now understand
  same-origin cache boundaries, reject missing CSRF, expect logout 204 and verify
  session revocation; the old direct-API CORS checks remain for that mode only.
- Render Blueprint targets the exact repository, main, Singapore, native
  Python/uv, one free instance and pool maximum 3, with automatic deploy off.
  Render CLI validation passed. Removed a shutdown-delay override unsupported by
  free instances. All three GitHub workflows passed actionlint 1.7.12; its
  downloaded binary was verified against the official release checksum.
- Production backup is explicit, encrypted with age, uses PostgreSQL 17 clients,
  includes both application and migration-ledger schemas, and retains artifacts
  for seven days. The owner still needs an off-provider copy/retention policy,
  protected decryption identity and a separately verified recovery rehearsal.
- Real Chrome on local HTTPS passed the full browser → Next.js → FastAPI →
  **actual Prisma development database** path: login, Secure/HttpOnly/SameSite
  cookies, protected catalog creation, missing-CSRF rejection, hostile-Origin
  rejection, logout, cleared cookies, and revoked session. Hosted bootstrap
  returned 403. No direct browser requests went to backend port 8000, and no
  browser JavaScript errors occurred. The backend used production cookie rules
  but an exact-match guard allowed only the development database credential.
  The self-signed certificate was scoped to the test browser context; the OS
  certificate store was not modified. Production and Supabase were not written.
- Scoped cleanup removed only this run's synthetic development account, sessions,
  idempotency and marked catalog records. Temporary test servers were stopped.
  No schema reset, TRUNCATE, sequence reset, or unrelated process cleanup occurred.
- Vercel plugin discovery returned 403 for the intended team; the independently
  authenticated CLI could list that same explicit team and found no CataNova
  project. Render still has no CataNova service. No unrelated project was reused.
  The CLI wrapper now invokes pinned Node entry points directly so cmd.exe
  cannot interpret URL ampersands as extra shell commands.
- Updated the deployment guide and environment contract for owner setup and
  the exact release sequence. The user authorized committing/pushing the earlier
  restructuring together with Plan 19 to `pre-production`, **not** merging main.
- Final validation: **178 unit/API tests passed**, plus **28 real PostgreSQL
  integration tests passed** against newly created disposable loopback databases.
  One native-container archive drill was explicitly skipped: Windows has no
  Docker CLI and no test container was selected. Existing WSL/local working
  records were not reset. Pyrefly reported zero errors; Ruff lint/format,
  OpenAPI/generated-client drift, deployment contracts and actionlint passed.
  **57 frontend tests in 15 files passed** with the single-thread command above;
  Prettier, ESLint, TypeScript and the final optimized production build passed.
- Ran the actual release smoke command against the local HTTPS relay, not just
  a mocked unit test. It verified response security headers, uncached health
  checks, login/session, hostile-Origin 403, missing-CSRF 403, logout 204 and
  revoked-session 401. The certificate was trusted only by that test process.
  Shared response headers now apply in Next.js previews and `next start` as well
  as Vercel. Redacted local evidence is ignored under `.dev-processes/`.
- Delivered the implementation and required prior restructuring in commit
  `0a8a0f2620ce60b6f661bca0d53990402d49e648` to `pre-production`.
  GitHub confirmed the repository's canonical name is now
  `asteroidcrib729/catanova-lms`; updated the local origin and deployment
  references to that verified location. No main merge or public deployment was
  performed. The follow-up reference correction is reported in Git as well.

### Remaining work before public production cutover

1. The owner merges the follow-up pre-production PR, including the monorepo
   working-directory correction and regression tests. The team-scoped Vercel
   token was accepted in release attempt 3; no additional token replacement is
   currently needed. Never retrieve encrypted CI secrets or request them in chat.
2. After stable CI passes for the new current main SHA, dispatch a fresh release
   for that full SHA; do not retry the old checkout containing the path bug. Require successful
   Vercel build/deploy and authenticated same-origin smoke checks, then verify the
   actual public browser flow and scoped persistence/role/CSRF/logout behavior.
3. Recheck source counts before declaring cutover and preserve Supabase. Current
   initialization is not an online replication mechanism; any unexpected new
   source records require reconciliation, not deletion or a blind switch.
4. Deliver execution evidence and owner-command improvements to pre-production;
   the owner retains control over their manual PR merge. Do not deploy unreviewed
   follow-up code just to claim the plan is complete.
5. Only after successful live cutover should the owner separately retire Supabase.

### Hosted execution after the owner's PR merge

- Verified PR #2 merged to main at
  `dfc1c74ac19c6af9b5b54dcc5653fc081c13d29e`. Stable CI and every selected component
  job passed, including the actual hosted local-PostgreSQL recovery job.
- Rechecked Supabase read-only: all eleven business/session tables remain empty,
  with the original three schema-version rows. No source configuration, grants,
  records or project lifecycle were changed.
- Created only CataNova's Vercel project in the previously confirmed team:
  `prj_jlPOOmpVvFgNu6HeHPZ4SWHKKEUe`, root frontend, Next.js, Node 24, Singapore
  functions. Git connection to `asteroidcrib729/catanova-lms` succeeded. Automatic
  Git builds use ignored-build command `exit 0`; reviewed CLI releases remain
  manual. Production-only APP_ORIGIN and BACKEND_API_URL were configured; no
  database credential was placed in Vercel. The plugin still returns 403 for this
  team; its documented fallback succeeds with the CLI's own authenticated session.
- Created Render `srv-dba9166q1p3s73apgsv0` (`catanova-api`) in My Workspace,
  Singapore, free native Python/uv, one instance, bounded pool 3, automatic deploy
  off, exact dashboard origin and `/health/ready`. Provisioned with MCP and CLI
  using reviewed descriptor settings; it is **not** a Dashboard-managed Blueprint.
  Do not create duplicate resources or assume a Blueprint sync owns this service.
  Non-secret hosting identities are recorded in `deploy/hosting-resources.json`.
- Prepared ignored `.env.production` without revealing its URL. The owner
  created their administrator through private masked input. First setup initially
  hit inherited terminal environment overrides and a generic validation failure.
  Added precise static error messages and field prevalidation, plus four tests
  proving invalid input never echoes passwords or reaches account creation.
  Existing terminal variables take precedence over `uv --env-file`; the guide
  now explicitly clears only the terminal's LMS_ENVIRONMENT and DATABASE_URL.
- The owner explicitly approved a persistent ordinary member, `catanova.smoke`,
  for release checks. Generated its password privately and stored it only in
  GitHub production secrets via stdin. It has no staff or administrator rights.
  The owner separately approved the privileged production database credential
  transfer to GitHub production and Render only. GitHub publication succeeded.
  Safety review rejected a proposed stdout-mediated Render transfer; no secret
  was displayed and no alternate extraction was attempted. The owner instead
  set DATABASE_URL privately in Render. The source is still untouched.
- Created GitHub environment production with a selected-branch policy allowing
  **main only**, its six non-secret release/backup variables and the required
  protected secrets. No existing branch-protection rules were weakened.
- Completed a real encrypted production backup/decryption/restore rehearsal.
  pg_dump/pg_restore 17.6 ran through the existing WSL Docker container, not
  Docker Desktop. Credentials stayed in process environment, not argv. The target
  was a new UUID-named loopback database only; it was dropped after verification.
  All twelve application-table row digests matched, including the two approved
  production accounts; all three private ledger rows and twelve RLS tables passed.
  No original local database, production table or sequence was reset.
- The local encrypted archive is
  `catanova-production-20261018T093653Z.dump.age`, SHA-256
  `4aaab8fe9b507185ab30ad07f1680d1abbb187ce49354a2c4e84e06cf9facaeb`.
  Archives/evidence remain ignored under `.dev-processes/recovery/`; plaintext
  temporary archives were removed. The age identity is restricted to the current
  Windows account. Its public recipient alone is in BACKUP_AGE_RECIPIENT. The
  owner should retain the identity separately and copy encrypted backups off-machine.
- The actual **Backup production** workflow succeeded:
  [run 39116166928](https://github.com/asteroidcrib729/catanova-lms/actions/runs/39116166928).
  Downloaded encrypted artifact 12132087904 and verified its SHA-256 locally.
  This is real hosted backup evidence, in addition to the disposable restore drill.
- The production release workflow
  [run 39116209370](https://github.com/asteroidcrib729/catanova-lms/actions/runs/39116209370)
  passed exact-main/CI, configuration and read-only Prisma/administrator gates.
  Its deploy hook released Render deploy `dep-dba980qjnfac73erghsg`; public
  `/health/ready` returned 200, production, PostgreSQL ready and the exact main SHA.
  The next boundary failed: Vercel CLI pull returned **User not found (404)** for
  the owner-supplied CI token. CLI environment-token handling was independently
  checked with a deliberately invalid nonsecret value. Requested token replacement
  privately in GitHub, not in chat; do not report the frontend as deployed yet.
- After the owner replaced VERCEL_TOKEN, retried only the failed job of release
  39116209370 (attempt 2). The same reviewed main SHA passed its backend gates,
  but Vercel pull again failed with **User not found (404)** before any dashboard
  build/deploy. GitHub secret metadata confirmed an update at
  `2026-10-18T13:15:19Z`. Inspection of the pinned CLI implementation confirmed
  it explicitly uses VERCEL_TOKEN ahead of its local authentication store. A
  separate read-only local CLI identity check still resolves the intended team.
  This narrows the failure to the CI credential path; it does not prove whether
  the private value, its issuing account, or Vercel token handling is responsible.
  Added a masked-input owner helper to verify the actual token directly with
  Vercel and optionally publish that same verified value to the exact GitHub
  environment. It never prints token values or automatically triggers deployment.
  PowerShell parsing and four mocked checks passed: accepted identity/project,
  rejected identity, wrong project/team, and token-name-as-input. Failure checks
  confirmed provider exception details and the synthetic token were not exposed.
  Real validation/publication requires the owner's hidden terminal input; it has
  not been claimed as completed or used to bypass the gated release.
- The owner clarified that both rejected tokens were project-only. Inspected
  the pinned CLI's user/team lookup and Vercel issue
  [17506](https://github.com/vercel/vercel/issues/17506), which reports the same
  user-404/team-403/project-200 pattern. A project-only token can be valid yet
  incompatible with this workflow; corrected the helper's diagnostic accordingly.
  The owner then privately replaced the secret with a personal access token
  scoped to the owning team. Release attempt 3 **passed Vercel pull**, confirming
  that authentication is resolved for this pipeline. Team scope is broader than
  project-only access; full-account access was not requested.
- The owner changed the dashboard domain to `https://catanova.vercel.app`.
  Verified that exact domain belongs to CataNova and is verified. Updated only
  Vercel production APP_ORIGIN, GitHub production PRODUCTION_WEB_BASE_URL and
  Render LMS_ALLOWED_ORIGINS to that origin. Render MCP merged the single key
  without replacing other configuration and triggered deploy
  `dep-dbacke61egvs73a73kt0`. The service remains MCP/CLI-managed, not a Blueprint;
  render.yaml already leaves this origin operator-supplied (`sync: false`).
- Attempt 3 stopped at dashboard build with `spawn sh ENOENT`, before deployment.
  Confirmed the root cause in CLI 64.5.0: build workPath is
  `join(cwd, project.settings.rootDirectory || '.')`. Running inside frontend
  with provider rootDirectory=frontend produces a nonexistent frontend/frontend.
  Changed Vercel pull/build/deploy to explicit repository-root working directories,
  leaving the correct provider rootDirectory untouched. Added contract validation
  and four regression cases covering each doubled directory and a missing explicit
  directory. This correction is on pre-production only; main remains unchanged.
  Hosted build/deploy and browser checks must resume after the owner's manual merge.
- Rechecked Supabase read-only after the domain/token changes: all eleven
  business/session tables still contain zero rows, with three schema-version rows.
  No source records, configuration, grants or project lifecycle were changed.
- Correction validation: **186 backend unit/API tests passed**, with 29 PostgreSQL
  tests deselected locally. Ruff lint and formatting passed; Pyrefly reported zero
  errors. All three workflows passed actionlint and deployment contracts passed.
  Public Render readiness returned 200, production and the reviewed main revision;
  a preflight from `https://catanova.vercel.app` returned 200 with that exact
  allowed origin. These are backend/contract checks, not evidence that Vercel has
  built or deployed the corrected workflow or that public browser checks passed.
- New diagnostic validation: 182 unit/API tests passed, 29 PostgreSQL tests
  deselected locally; Ruff passed and Pyrefly reported zero errors. Existing main
  CI provides the separate PostgreSQL gate. Final production browser verification
  remains required after Vercel authentication and the gated release succeed.

## Permission compatibility investigation — retained findings

User direction on 2026-10-18: proceed with the work needed for Supabase-to-Prisma
migration and initiate Supabase integration installation/authentication. This
authorizes investigating and adapting provider-specific permissions; it does not
make unsupported SQL features available or establish equivalent security by itself.
Do not repeat the same permission-choice question. Verify the actual source and
target controls and report changed guarantees explicitly before production cutover.

The empty-development schema trial ran inside a transaction. Prisma rejected the
existing `REVOKE` permission hardening with:

```text
psycopg.errors.InsufficientPrivilege:
restricted superuser cannot grant or revoke privileges
```

That initial transaction rolled back; at that point neither target contained
`lms`. Subsequent reviewed adaptation initialized both targets as recorded above.
No source records, grants, policies, or historical migrations were changed.

The existing design assumes owner-managed `REVOKE`/`GRANT` statements and a
separate restricted runtime role. These Prisma credentials report
`rolcreaterole=false`. Do not describe the database as a drop-in equivalent for
that security model, delete grants from historical SQL, disable RLS, use the
production credential in development, or continue a partial import.

Before continuing:

1. Follow the user's existing authorization to investigate and adapt the
   database-level permission model; do not ask for the same approval again.
   Verify and explain any changed guarantees before production cutover.
2. Investigate Prisma's supported credential/role controls against the actual
   service. Separate connection keys alone do not prove separate SQL privileges.
3. If adapting, design explicit provider-specific schema/permission handling and
   explain any changed guarantees. Preserve migration history and application
   authentication/authorization. Do not simply suppress privilege errors.
4. Verify the agreed controls in development before production import or hosting.
5. Obtain source access through the Supabase integration or an ignored credential
   file, inspect real source policies, then execute the backup/import plan.

The remaining GitHub/Vercel/Render connections and public launch are intentionally
pending, not completed. Supabase must not be deleted at this stage.

### Verified target capabilities after continuation approval

A synthetic-object probe was run only against the development database, with
every change rolled back. The probe namespace was confirmed absent afterward.

| Capability | Observed result |
| --- | --- |
| Enable row-level security | Supported |
| `CREATE ROLE` | Rejected: SQLSTATE `42501`, restricted superuser cannot create roles |
| `GRANT` / `REVOKE` | Rejected: SQLSTATE `42501`, restricted superuser cannot grant or revoke privileges |
| PUBLIC privileges on a newly created private schema | None by default |
| PUBLIC privileges on a newly created table | None by default |

The installed Prisma CLI can mint separately named database connections, but
does not expose a SQL privilege/role option for that operation. A connection
named `readonly` is only a label, not proof of read-only enforcement. Do not
claim that separate connection credentials reproduce migration/runtime SQL
role isolation.

Proceed by inspecting the real source schema, policies, ACLs, and ownership once
Supabase is connected. Preserve immutable migration files. Any Prisma-specific
adapter must explicitly identify unsupported ACL operations, verify resulting
schema/table/sequence/function exposure and RLS, and report remaining differences.
Never blanket-ignore permission errors or disable RLS to make an import pass.

### Supabase connection issue — resolved

The newly installed plugin initially exposed no database tools. They subsequently
loaded in this chat, and authenticated source queries succeeded. No reinstall,
credential disclosure, or new chat is now required. Repository root is
`C:\Users\DESKTOP-Q2TMP8U\Downloads\Source-Code\catanova-lms`.

## Agreed architecture

- Keep Python 3.14, uv, FastAPI, psycopg, the existing repositories, and the `lms`
  PostgreSQL schema. Prisma is the managed PostgreSQL provider, not a replacement
  Python ORM or a move to Prisma Compute.
- Create one new Prisma project, `catanova-lms`, in the existing **Personal
  workspace**. Do not modify its unrelated `havenfield` project.
- Create two independent databases in that project: `catanova-production` and
  `catanova-development`. Development must never point at production.
- Use Singapore (`ap-southeast-1`) for both databases and Singapore for the new
  Render backend. The user delegated region selection; co-location reduces
  backend-to-database distance. Do not relocate other applications.
- Host FastAPI on Render in the user-confirmed **My Workspace**. Host the Next.js
  frontend on Vercel, connecting both services to the existing repository:
  `https://github.com/asteroidcrib729/catanova-lms` (GitHub-confirmed rename).
- Production tracks `main`. Preserve the user's manual PR merge workflow from
  `pre-production`; do not push directly to `main` or deploy stale source just
  to produce a URL.
- Migrate existing Supabase records. Keep Supabase intact through backup,
  rehearsal, verification, and cutover. Its deletion is a separate user action.

## Initial discovery (superseded by the execution record above)

- Prisma, Vercel, and Render plugins are connected and read-only access verified.
  CLI authentication is independent of plugin authentication.
- No existing CataNova Prisma project, matching Vercel repository project, or
  Render service was found. The weather app on Render is unrelated.
- The local repository has substantial uncommitted restructuring on
  `pre-production`. Git-backed production cannot contain those changes until
  they are committed, pushed, reviewed, and merged by the user.
- Root `.env` currently connects to WSL PostgreSQL at `127.0.0.1:55432`.
  A hosted Supabase source credential is not configured. Never guess it or
  request it in chat; obtain it through an ignored local credential file.
- Existing API/Postgres settings reject remote URLs in `local`/`test` modes.
  Simply setting `preview` is not an HTTP local-development solution, because
  it enables secure cookies. An explicit safe hosted-development mode is needed.
- Schema SQL is currently stored under `supabase/migrations`, and the manual
  staging workflow still invokes Supabase. Those are migration dependencies to
  replace, not just provider names to search-and-replace.

## Execution sequence

### 1. Tooling and authentication

1. Verify existing plugin identity/workspace reads before installing anything.
2. Install pinned CLI tools without adding Node dependencies to the Python
   backend or frontend runtime. Initial pins: Prisma `8.0.0-rc.15`, Vercel
   `64.5.0`, Render `2.29.0`.
3. Verify Render's official Windows archive SHA-256 before execution. Keep
   downloaded tools and local auth state outside version control.
4. Reuse valid CLI sessions; otherwise start one browser login per provider,
   retain its process, and verify identity and remote access after consent.
   Never copy OAuth tokens between plugins and CLIs.

### 2. Provision isolated databases

1. Recheck names and project identity to prevent duplicate provisioning.
2. Create the project once and both databases within that same project. The
   plugin's single database creation operation also creates a project, so do
   not call it twice expecting two databases under one project. Use a supported
   project-targeted CLI/API operation instead.
3. Record only project/database IDs, names, and region in tracked configuration.
4. Store admin and runtime PostgreSQL URLs only in ignored local files and
   platform secret stores. Never use `prisma://` URLs with psycopg.
5. Use direct PostgreSQL connections for migration, dump/restore, and the
   existing session-setting-based backend until pool compatibility is verified.
   Do not silently replace these with transaction-pooled connections.
6. Inspect actual privileges and provider limitations before creating restricted
   runtime roles. Never assume Supabase roles exist on Prisma.

### 3. Preserve and migrate data

1. Confirm the authoritative Supabase source and separately identify any local
   development records that need preserving. Do not copy production personal
   records into the development database by default.
2. Check source/target PostgreSQL versions, extensions, role references, schema
   versions, and volume. Use compatible PostgreSQL client tools.
3. Take an `lms`-schema logical backup, verify its archive listing and checksum,
   and keep it private. Preserve identities, sequences, foreign keys, password
   hashes, circulation history, fines, requests, and feedback.
4. Rehearse the restore in an explicitly disposable target. Omit source-specific
   ownership/grants, then establish target runtime permissions explicitly.
5. Validate schema, all table row counts, sequence positions, constraints, and
   representative business reads. Counts alone do not prove data equivalence;
   use non-disclosing checksums where practical.
6. Stop source writes before the final snapshot; retain that freeze through
   final import verification and application switch. Do not allow split writes.
7. Restore production into its empty target only. Refuse a nonempty target;
   do not overwrite or automatically drop schemas on a failed retry.
8. Decide explicitly whether existing browser sessions are retained or revoked;
   verify login and fresh sessions after cutover regardless.

### 4. Update application and migration tooling

1. Establish provider-neutral migration ownership and a version/checksum ledger.
   Preserve historical SQL and existing `lms.schema_version` semantics; do not
   rewrite history or replay initial schema creation on a restored database.
2. Add an explicit local-HTTP + hosted-development database configuration with
   TLS and environment isolation. Keep destructive test databases loopback-only.
   Keep production HTTPS/secure-cookie protections unchanged.
3. Verify psycopg startup options, search path, transaction boundaries, prepared
   statements, advisory locks, and timeouts on the actual Prisma endpoint.
4. Retain bounded pools/queues, ordered locks, idempotency, and retries only for
   confirmed transaction aborts. Start with one Render instance and a small pool.
5. Replace Supabase-specific migration/development workflow commands and relevant
   environment contracts. Keep schema migration out of backend server startup.
6. Update `.env.example`, development helpers, tests, README, and the concise
   `DEPLOYMENT.md`. Historical plans keep their original terminology.

### 5. Connect Git-backed hosting

1. Resolve the exact Vercel owner/project and Render workspace/service before
   creating or updating a connection. Do not reuse an unrelated linked project.
2. Configure Vercel with repository root directory `frontend`, Node 24, locked
   npm install/build commands, and production branch `main`.
3. Configure Render from the repository root with the verified Python/uv runtime
   commands, public port binding, readiness checks, production environment,
   and only production database credentials.
4. Configure exact frontend/backend origins. Verify the existing cross-origin
   cookie/CSRF design with real production hostnames; the frontend cannot read
   an API-host-only CSRF cookie across unrelated Vercel/Render domains. Resolve
   this before public launch rather than weakening authentication protections.
5. Store the FastAPI origin in server-only BACKEND_API_URL and the canonical
   dashboard origin in APP_ORIGIN. Leave NEXT_PUBLIC_API_BASE_URL empty for
   same-origin browser requests. Database/admin credentials belong exclusively
   to backend/migration secret stores, never Vercel or public variables.
6. Connect GitHub through the provider's authorized GitHub integration; if repo
   access is missing, ask the user to approve that repository in the browser.
7. Keep deployments disabled/unpublished until database verification and the
   user's PR merge place the intended code on `main`. Connecting a repository
   is not evidence that a production deployment is ready.

### 6. Verification and handoff

1. Run backend lint/type/tests and frontend format/lint/type/tests/build.
2. Test migrations and read/write/concurrency behavior on an isolated database.
3. Test local browser sign-in, catalog, checkout/return, reservations, fines,
   requests, feedback, and logout against the development database; verify
   persistence across an actual backend restart.
4. Deploy database first, backend second, frontend third. Verify live/readiness,
   browser authentication, CSRF-protected writes, role boundaries, and persistence.
5. Confirm GitHub connections and `main` branch behavior on both hosting services.
6. Record URLs, identities, source commit, checks, any limitations, and rollback
   instructions. If cutover fails before new writes, restore the old backend
   configuration; after new writes, reconcile data before switching back.
7. Only declare migration complete after source/target verification and live
   application checks. The user may then separately retire Supabase.

## References verified during discovery

- [Prisma Postgres](https://www.prisma.io/docs/postgres)
- [Prisma PostgreSQL migration](https://www.prisma.io/docs/postgres/import-from-existing-database)
- [Prisma database CLI](https://www.prisma.io/docs/cli/postgres)
- [Prisma project CLI](https://www.prisma.io/docs/cli/project)
- [Prisma connection modes](https://www.prisma.io/docs/postgres/database/connecting-to-your-database)
- [Render CLI](https://render.com/docs/cli)
- [Render MCP access](https://render.com/docs/mcp-server)

These references explain the intended migration; they are not evidence that
provisioning, data transfer, or production deployment has already succeeded.
