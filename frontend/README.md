# CataNova dashboard

**Catalog. Manage. Discover.** Brand constants live in `src/lib/brand.ts`; SVG marks
and the wordmark live in `public/brand/`. See [the brand guide](../development-plans/BRAND.md).

This directory is the isolated Next.js 16 App Router dashboard in the project monorepo. It communicates only with the versioned FastAPI contract and never receives database credentials. Tailwind CSS 4 provides utility styling through the official PostCSS adapter, and React Compiler is enabled for the complete application.

## Local commands (PowerShell)

Copy `.env.local.example` to `.env.local`, then use the executable shim because this system's PowerShell policy blocks `npm.ps1`:

```powershell
& "C:\Program Files\nodejs\npm.cmd" ci
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Run FastAPI separately from this directory before testing signed-in workflows:

```powershell
Set-Location ..
uv run --locked --env-file .env.development uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

Quality and contract commands:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run generate:api
& "C:\Program Files\nodejs\npm.cmd" run format
& "C:\Program Files\nodejs\npm.cmd" run check
```

Generated API files under `src/lib/api/generated/` must not be edited manually. Regenerate them after exporting `../contracts/openapi.json` from FastAPI.

## Frontend configuration

- `postcss.config.mjs` loads `@tailwindcss/postcss`, and `src/app/globals.css` imports Tailwind.
- Styling is Tailwind-first throughout: use utilities in components and shared control recipes in `src/lib/ui.ts`. Keep complete class names literal for production scanning; do not construct utility names dynamically.
- `src/app/globals.css` contains only light/dark brand tokens, `@theme inline` registration, and native focus/disabled accessibility defaults. Component CSS modules are no longer used.
- Use responsive utilities for layouts and `motion-safe:` for animation and transitions. Loan tables scroll within their own container on narrow screens.
- `next.config.ts` enables `reactCompiler: true`, backed by the locked `babel-plugin-react-compiler` development dependency.
- `npm run check` verifies contract drift, Prettier, ESLint, strict TypeScript, Vitest, and the optimized production build.
- Leave `NEXT_PUBLIC_API_BASE_URL` empty: the browser calls this dashboard's `/api/v1/...` relay. Production rejects a direct public API override.
- Server-only `BACKEND_API_URL` selects FastAPI, while `APP_ORIGIN` is the exact canonical dashboard origin. Both are required in production. Neither contains database credentials.
- `NEXT_PUBLIC_CSRF_COOKIE_NAME` must match the readable CSRF cookie configured by FastAPI; its default is `lms_csrf`.

## Dashboard behavior

The public route is statically rendered and restores a browser session only after
hydration. The dashboard exposes member workflows for catalog, circulation, fines,
requests, feedback, and recommendations; staff receive inventory, circulation,
financial, engagement, and reporting controls; administrators additionally receive
account management and fine-waiver controls. These role-specific controls improve the
interface but do not replace FastAPI authorization.

Safe reads use bounded retries when Render is waking. Mutations never retry
automatically: a deliberate retry retains the same idempotency key so an ambiguous
response cannot duplicate the command. The client distinguishes a waking backend from
an unavailable database and does not poll either provider to keep it active.

## Vercel production boundary

`vercel.json` fixes the locked install/build commands and response security headers. In
Vercel project settings, select this directory (`frontend/`) as Root Directory, Node.js 24,
and keep access to source files outside the Root Directory disabled. Configure
server-only `BACKEND_API_URL` and `APP_ORIGIN`, leave `NEXT_PUBLIC_API_BASE_URL`
empty, and retain the default `NEXT_PUBLIC_CSRF_COOKIE_NAME`; follow
[`../development-plans/DEPLOYMENT.md`](../development-plans/DEPLOYMENT.md) and never add database or provider credentials here.
