[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$parentRoot = Split-Path -Parent $sourceRoot
$destinationRoot = [System.IO.Path]::GetFullPath((Join-Path $parentRoot 'catanova-lms'))
$sourceName = Split-Path -Leaf $sourceRoot
if ($sourceName -notin @('library-management-system', 'catanova-lms') -or
    -not (Test-Path -LiteralPath (Join-Path $sourceRoot '.git')) -or
    (Split-Path -Parent $destinationRoot) -ne $parentRoot) {
    throw 'This helper only renames the existing CataNova repository to its validated sibling directory.'
}
$uvCommand = Get-Command uv.exe -ErrorAction Stop
Set-Location -LiteralPath $parentRoot
[Environment]::CurrentDirectory = $parentRoot

if ($sourceRoot -ne $destinationRoot) {
    if (Test-Path -LiteralPath $destinationRoot) {
        throw 'catanova-lms already exists; refusing to overwrite it.'
    }
    try {
        Rename-Item -LiteralPath $sourceRoot -NewName 'catanova-lms'
    }
    catch {
        throw 'Close the old VS Code workspace and its terminals, then run this helper from a separate PowerShell window in the parent Source-Code directory. No repository files were overwritten.'
    }
}

Set-Location -LiteralPath $destinationRoot
[Environment]::CurrentDirectory = $destinationRoot
$originalUvCache = $env:UV_CACHE_DIR
try {
    $env:UV_CACHE_DIR = Join-Path $destinationRoot '.uv-cache'
    & $uvCommand.Source venv --allow-existing --no-managed-python --no-python-downloads --python 3.14 --prompt catanova-lms .venv
    if ($LASTEXITCODE -ne 0) { throw 'Folder renamed, but virtual environment refresh failed.' }
    & $uvCommand.Source sync --locked --reinstall
    if ($LASTEXITCODE -ne 0) { throw 'Folder renamed, but dependency reinstall failed. Run uv sync --locked --reinstall from the new folder.' }
    & $uvCommand.Source run --locked --no-sync lms --version
    if ($LASTEXITCODE -ne 0) { throw 'CataNova CLI validation failed.' }
}
finally {
    $env:UV_CACHE_DIR = $originalUvCache
}

Write-Host "CataNova repository ready at: $destinationRoot" -ForegroundColor Green
Write-Host 'Reopen catanova-lms in VS Code and select its root .venv interpreter.'
