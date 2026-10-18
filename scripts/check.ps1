[CmdletBinding()]
param(
    [switch]$SkipFrontendBuild,
    [switch]$Postgres
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$uv = (Get-Command uv.exe -ErrorAction SilentlyContinue).Source
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source

function Invoke-Checked {
    param(
        [Parameter(Mandatory)] [string]$Label,
        [Parameter(Mandatory)] [scriptblock]$Command
    )

    Write-Host "`n==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

if (-not $uv) {
    throw "uv.exe was not found on PATH. Install uv and follow README.md setup first."
}
if (-not $npm) {
    throw "npm.cmd was not found on PATH. Install the Node.js major listed in frontend/.nvmrc."
}
if ($Postgres -and -not $env:LMS_TEST_POSTGRES_ADMIN_URL) {
    throw "Set LMS_TEST_POSTGRES_ADMIN_URL to the loopback admin database before -Postgres."
}
if ($Postgres -and -not $env:LMS_TEST_POSTGRES_CONTAINER) {
    $env:LMS_TEST_POSTGRES_CONTAINER = "supabase_db_catanova-test"
}

Push-Location $repositoryRoot
try {
    Invoke-Checked "Sync locked Python environment" { & $uv sync --locked }
    Invoke-Checked "Ruff lint" { & $uv run --locked --no-sync ruff check . }
    Invoke-Checked "Ruff formatting" { & $uv run --locked --no-sync ruff format --check . }
    Invoke-Checked "Pytest" { & $uv run --locked --no-sync python -m pytest }
    Invoke-Checked "Pyrefly" { & $uv run --locked --no-sync pyrefly check }
    Invoke-Checked "OpenAPI contract" { & $uv run --locked --no-sync python -m backend.scripts.export_openapi --check }
    Invoke-Checked "Deployment contracts" { & $uv run --locked --no-sync python -m backend.scripts.validate_deployment }
}
finally {
    Pop-Location
}

Push-Location (Join-Path $repositoryRoot "frontend")
try {
    if ($SkipFrontendBuild) {
        Invoke-Checked "Frontend contract" { & $npm run check:api }
        Invoke-Checked "Frontend formatting" { & $npm run format:check }
        Invoke-Checked "Frontend lint" { & $npm run lint }
        Invoke-Checked "Frontend types" { & $npm run typecheck }
        Invoke-Checked "Frontend tests" { & $npm run test }
    }
    else {
        Invoke-Checked "Frontend checks and production build" { & $npm run check }
    }
}
finally {
    Pop-Location
}

Write-Host "`nAll selected checks passed." -ForegroundColor Green
