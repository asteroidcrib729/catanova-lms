# Development Plan 22: Open-source licensing and documentation refresh

## Scope and decision

On 2026-11-01 the owner selected **Apache-2.0 with NOTICE**. License the original
CataNova code and documentation, including the retained legacy C++ implementation,
and preserve Faraz Hussain / asteroidcrib729 / original repository attribution.
Keep third-party licenses separate; do not add extra license conditions or claim
that Apache-2.0 requires a visible credit banner or disclosure of all derivative code.

## Implementation

- Add the official, unmodified Apache-2.0 text as `LICENSE` and attribution as `NOTICE`.
- Retain the MIT notice for the checked-in Next.js template SVGs in
  `THIRD_PARTY_NOTICES.md`; installed dependencies retain their own licenses.
- Declare SPDX `Apache-2.0` in Python and frontend package metadata and include
  the three licensing files in Python wheel/source distributions.
- Update README navigation, redistribution guidance and local-preview hostname;
  refresh dated release references and close Plan 21's completed delivery checklist.
- Add offline regression tests for licensing metadata and notice consistency.

## Verification and delivery

Run Python lint/format/type/test/contract/deployment checks, the frontend quality
gate, and wheel/source build inspection. Confirm that the packaged license and
notices exactly match the repository files and that metadata reports Apache-2.0.
Push only the reviewed changes to `pre-production`, dispatch the existing full CI
workflow for that exact revision, and wait for all selected jobs to succeed.
Report the commit and CI run link at handoff. This iteration does not authorize
a new merge to `main`, production deployment, database mutation or credential change.

Historical October production results remain clearly dated; local and hosted CI
checks in this iteration do not constitute another live production acceptance test.

## Local results, 2026-11-01

- Official Apache text matched the published text after newline normalization.
- The five retained template SVG Git blob hashes matched their upstream assets.
- Python: 197 passed, 31 explicitly skipped without a disposable PostgreSQL URL;
  hosted CI is responsible for the real PostgreSQL job. The first attempt hit
  access denied in the host's existing temporary directory; an isolated
  `.dev-processes/licensing-full-pytest` base directory passed. An existing
  pytest-cache permission warning did not affect test results.
- Ruff lint/format, Pyrefly (0 errors), OpenAPI export and deployment-boundary
  validation passed. `uv lock --check` passed without dependency changes.
- Frontend: generated client, Prettier, ESLint, TypeScript, all 59 tests and
  optimized Next.js production build passed.
- Wheel and source archive both contained all three licensing files matching
  the repository after newline normalization, with `License-Expression:
  Apache-2.0` metadata. No private configuration files were packaged.

The final CI run URL and exact pushed commit are reported in the delivery handoff;
the existing manual CI dispatch runs the full component matrix, not just docs.
