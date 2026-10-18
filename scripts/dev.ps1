[CmdletBinding()]
param(
    [switch]$StartDatabase,
    [ValidatePattern('^[A-Za-z0-9_.-]+$')]
    [string]$EnvFile = '.env.development'
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$uv = (Get-Command uv.exe -ErrorAction SilentlyContinue).Source
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
$npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
$cliVersionFile = Join-Path $repositoryRoot "supabase\CLI_VERSION"

if (-not $uv) {
    throw "uv.exe was not found on PATH. Install uv and follow README.md setup first."
}
if (-not $npm) {
    throw "npm.cmd must be available on PATH."
}

if ($StartDatabase) {
    if ($EnvFile -ne '.env') {
        throw "-StartDatabase is only for the optional local stack. Add -EnvFile .env; Prisma development needs no Docker."
    }
    if (-not $npx -or -not (Test-Path -LiteralPath $cliVersionFile -PathType Leaf)) {
        throw "The optional local stack requires npx.cmd and supabase/CLI_VERSION."
    }
    $cliVersion = (Get-Content -LiteralPath $cliVersionFile -Raw).Trim()
    Push-Location $repositoryRoot
    try {
        Write-Host "Starting the repository's local Supabase stack only..." -ForegroundColor Cyan
        & $npx --yes "supabase@$cliVersion" start
        if ($LASTEXITCODE -ne 0) {
            throw "Local Supabase startup failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $EnvFile) -PathType Leaf)) {
    throw "Missing $EnvFile. Copy its example and set the correct private database URL first."
}
$apiEnvironment = "--env-file $EnvFile "
$apiCommand = "Set-Location '$repositoryRoot'; & '$uv' run --locked ${apiEnvironment}uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log"
$webCommand = "Set-Location '$repositoryRoot\frontend'; & '$npm' run dev -- --hostname 127.0.0.1"

Write-Host "`nDevelopment prerequisites are valid." -ForegroundColor Green
Write-Host "Run these commands in two separate PowerShell tabs:" -ForegroundColor Cyan
Write-Host "  API:       $apiCommand"
Write-Host "  Dashboard: $webCommand"
Write-Host "`nDefault: Prisma development via .env.development; no Docker required."
Write-Host "Optional existing WSL/local database: use -EnvFile .env."
Write-Host "This helper never migrates a database or starts servers automatically."
