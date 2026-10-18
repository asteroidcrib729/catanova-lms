# Development Plan 21: Final verification and reviewed release

## Scope

Verify the current public production release and pending repository changes with
regression, functional and accessibility testing. Commit all reviewed pending
changes to `pre-production`, create a descriptive PR and merge it to `main` only
after its checks pass. Do not bypass failed checks or claim that merging alone
publishes a manual deployment.
The owner subsequently explicitly authorized running **Deploy production** after
the merge and repeating live verification of the published revision.

## Safety and evidence

- Use only a uniquely generated local test database for administrator/librarian
  workflows, circulation, finance and account management. Stop its preview
  processes and remove only the generated database after testing.
- Public write checks use a uniquely marked temporary ordinary member and
  feedback. Delete only that run's test records afterward; never reset owner or
  CI-account passwords or alter genuine catalog/circulation/financial records.
- Keep credentials, browser authentication state, private data and raw traces
  out of Git. Preserve the latest encrypted production recovery material.
- Record outcomes rather than asserting complete WCAG compliance or capacity
  guarantees from automated scans and a small functional test workload.

## Initial findings

The current production revision is `9a5cf1a47eb4cdbe9c39119ba5633bf4e163b45b`.
Readiness confirmed production PostgreSQL/schema availability. Vercel's connector
denied access, but the existing CLI session successfully confirmed the matching
READY production deployment in the intended team/project. Render identity,
repository, production branch and readiness path also matched.

Public Chrome accessibility checks at 320px and 1280px in light/dark themes found:

- A serious `label-content-name-mismatch` on the non-compact brand link.
- Sign-in tabs lacked expected Arrow/Home/End navigation and roving tabindex.
- Closed mobile navigation was translated off-screen without visibility removal,
  leaving its controls keyboard-focusable (confirmed in public member testing).
- Dashboard pages lacked a first-level heading.
- Shared input borders had only 1.32:1 light / 1.44:1 dark contrast against their
  surface. The shared control recipe now uses the muted color: measured browser
  ratios are 5.94:1 light / 8.00:1 dark, above the 3:1 control-boundary target.

Fixes retain Tailwind-first styling and add regression tests for the accessible
brand name, tab navigation/panel relationship and mobile-menu focus behavior.

## Execution checklist

- [x] Complete backend/PostgreSQL and frontend regression/static/build gates.
- [x] Complete isolated member/librarian/administrator browser and API workflows.
- [x] Complete production ordinary-member protected write/reload/logout checks.
- [x] Repeat axe, keyboard, responsive and reduced-motion checks on fixed code.
- [x] Clean up generated browser-test accounts, records, databases and processes.
- [ ] Review and commit pending source, migration relocation, tests and evidence.
- [ ] Push `pre-production`, create PR, verify hosted CI and merge without bypass.
- [ ] Record PR/merge state and distinguish repository release from deployment.
- [ ] Run the authorized protected production release and repeat live verification.

## Results

## Verified candidate, 2026-10-18

| Gate | Evidence |
| --- | --- |
| Backend regression | **224 passed, 0 skipped**, including actual PostgreSQL constraints, transactions, deadlocks, concurrency, both migration adapters and a native custom-archive restore drill |
| Frontend regression | **59 passed** across 15 test files, including new tab, menu and accessible-name regressions |
| Static/build | Ruff lint/format, Pyrefly (0 errors), deterministic OpenAPI/client, deployment validation, Prettier, ESLint, TypeScript, optimized Next.js build, actionlint and whitespace checks passed |
| Role workflows | Real Chrome administrator/librarian/member logins; UI catalog creation; copies; reservation/cancel/checkout/renew/return; fines/payment/waiver; request/approval/acquisition; feedback/review/archive; UI librarian create/deactivate; member role/CSRF/origin denials; logout revocation |
| Persistence/retries | Feedback persisted after reload; simultaneous retries with the same idempotency key returned the same record; no duplicate replay record |
| Accessibility | **36 authenticated axe scans** across all role-visible sections/populated loans plus **8 anonymous scans**, light/dark, yielded 0 detected violations after fixes; no disabled rules or excluded elements |
| Keyboard/responsive | Arrow/Home/End/tab wrap and roving focus; labeled access panel; hidden mobile menu excluded from focus; Escape focus restoration regression; 320px/768px/1280px populated circulation containment |
| Browser boundaries | No JavaScript page errors or browser requests bypassing the same-origin relay; production session flags, role protection and logout were exercised |
| Production baseline | Real registration/sign-in/feedback/reload/idempotent retries/authorization/logout; only uniquely marked QA member/feedback/session/idempotency records removed afterward |
| Low-volume latency | 5 warm samples: web median 160.01ms / p95 206.00ms; same-origin readiness median 283.66ms / p95 354.55ms; mean backend DB probe 16.70ms |
| Historical SQL | All three original raw SHA-256 pins unchanged after relocation |

The Windows PostgreSQL rerun initially timed out because Ubuntu had stopped
after the CLI exited. Holding an explicit foreground WSL session open during
Windows-to-WSL testing resolved it. The final 224-test run forwarded only actual
`docker` process invocations to WSL; no database/API responses were mocked.
This is distinct from Plan 20's earlier native Linux test run.

Private, ignored local JSON records hold redacted browser/probe details, not
passwords or browser authentication state. New temporary production records and
local browser-fixture databases/processes were removed after each run. The test
engine is stopped and removed at final handoff; production recovery material is
preserved. Tooling used Chrome with Playwright 1.64.1 and axe integration 4.14.0.

## Limits and delivery evidence

- These are bounded functional/regression checks, not a sustained load test or
  proof of free-tier capacity/SLA. Cold-start latency was not characterized.
- Axe reported `color-contrast` items requiring review rather than automatic
  certification. Shared control/text palette ratios were checked separately;
  that is not an exhaustive visual contrast audit of every possible state.
- Reduced-motion preferences were emulated and the existing `motion-safe:` guards
  were retained. Human screen-reader, speech-input and inclusive-user testing,
  and full Firefox/Safari/mobile-device coverage remain outside this run.
- No genuine administrator credentials were used in public testing. Privileged
  workflows were verified on the isolated database, not on genuine production
  financial/circulation records.
- Final hosted CI, merge commit, deployment run and post-release outcomes are
  recorded in the resulting GitHub PR's release-verification comment. They are
  not inferred from local checks or a deploy trigger being accepted.

References: [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing),
[WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
