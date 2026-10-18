# CataNova

Catalog. Manage. Discover.

CataNova combines the clarity of a catalog with the possibility of a nova: a
connected workspace that helps collections, people, and new discoveries shine.

## Visual identity

- **Mark:** an open book inside a C-shaped orbit, lit by a four-point nova star.
  Use [the standalone SVG](frontend/public/brand/catanova-mark.svg) at small sizes
  and for the favicon; [the full logo](frontend/public/brand/catanova-logo.svg)
  includes the wordmark and tagline. Keep the SVG proportions unchanged.
- **Palette:** midnight ink `#152B29`, nova lime `#C8EE83`, warm paper `#F6F5EF`,
  and quiet sage. Both light and dark interfaces use the same brand accents.
- **Typography:** locally bundled Geist Sans for clear, welcoming interfaces;
  Geist Mono for small labels and operational details.
- **Voice:** curious, clear, and human. Avoid technical implementation language
  in reader-facing screens. The three pillars are Catalog, Manage, and Discover.

Shared frontend copy lives in `frontend/src/lib/brand.ts`. The browser title is
exactly **CataNova - Catalog. Manage. Discover.** The landing page, dashboard,
sign-in experience, API documentation, and retained CLI share the identity.

## Frontend styling

Use Tailwind utilities for all layout, typography, responsive states, and
interactive styles. Repeated control recipes live in `frontend/src/lib/ui.ts`;
keep class names complete and literal so Tailwind includes them in production.
Use `frontend/src/app/globals.css` only for shared light/dark brand tokens,
Tailwind theme registration, and native accessibility defaults. Do not add
component selectors or CSS modules. Prefer `motion-safe:` for animation and
transitions so reduced-motion preferences are respected.

## Rename boundaries

The local folder and Python distribution are `catanova-lms`; the frontend package
is `catanova-frontend`. Reopen the renamed folder in VS Code. Python 3.14 still
uses the root `.venv`; run `uv sync --locked` when moving or cloning the project.

If Windows blocks the folder rename, close the old VS Code workspace and its
integrated terminals. In a separate PowerShell window, go to
`C:\Users\DESKTOP-Q2TMP8U\Downloads\Source-Code` and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\library-management-system\scripts\rename-repository.ps1
```

The helper checks both paths, refuses to overwrite an existing directory, renames
the repository, and refreshes Python 3.14 activation scripts and installed entry
points without clearing the virtual environment. Reopen `catanova-lms` afterward.

Keep the existing Supabase project ID, PostgreSQL `lms` schema, migrations, API
routes, `LMS_*` environment variables, cookies, cloud resource names, and GitHub
remote unchanged. Those are integration/data identities, not display branding.
Historical development plans and legacy code keep their original terminology.
Renaming a cloud project or repository is a separate coordinated change.
