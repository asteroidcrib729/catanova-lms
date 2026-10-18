# CataNova backend

This directory contains the FastAPI application, the retained Python CLI, Python tests,
and backend operational scripts. The uv project files and Python 3.14 virtual
environment live at the repository root. From that root, run `uv sync --locked` and
`uv run --locked --env-file .env.development uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log`
to start the API. All application modules live under `app/`; `app/main.py` starts
FastAPI, and `app/cli/main.py` starts the retained CLI through `uv run --locked lms`.
Setuptools may generate `catanova_lms.egg-info/` at the repository
root during builds or editable installs. That disposable metadata follows the
distribution name, is Git-ignored, and is not application source.

The repository-level
[README](../README.md) covers the full monorepo.
