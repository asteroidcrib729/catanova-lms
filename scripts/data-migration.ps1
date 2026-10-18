[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments)]
    [string[]]$MigrationArguments
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$uv = (Get-Command uv.exe -ErrorAction SilentlyContinue).Source
if (-not $uv) {
    throw "uv.exe was not found on PATH. Install uv and follow README.md setup first."
}

Push-Location $repositoryRoot
try {
    & $uv run --locked python -m backend.scripts.migrate_data @MigrationArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Data migration command failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
