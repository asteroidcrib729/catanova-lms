[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateSet('prisma', 'vercel', 'render')]
    [string]$Provider,

    [Parameter(Position = 1, ValueFromRemainingArguments)]
    [string[]]$CloudArguments = @('--help')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$cloudRepository = Split-Path -Parent $PSScriptRoot
$cloudToolchain = Get-Content -LiteralPath (Join-Path $cloudRepository 'deploy/cloud-toolchain.json') -Raw | ConvertFrom-Json

# npm caches these tools separately from application/runtime dependencies.
# The wrapper forwards only explicitly supplied commands; it never deploys,
# selects an account, or changes credentials as an installation side effect.
if ($Provider -in @('prisma', 'vercel')) {
    $cloudNpm = Get-Command npm.cmd -ErrorAction Stop
    $cloudNode = Get-Command node.exe -ErrorAction Stop
    $cloudVersion = $cloudToolchain.$Provider
    # Only fixed installation arguments pass through npm.cmd. Forward user
    # arguments directly to Node so cmd.exe cannot interpret URL '&' or '|'.
    & $cloudNpm.Source exec --yes "--package=${Provider}@${cloudVersion}" -- $Provider --version | Out-Null
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $cloudCache = (& $cloudNpm.Source config get cache).Trim()
    $cloudEntry = $null
    foreach ($cloudPackage in Get-ChildItem -LiteralPath (Join-Path $cloudCache '_npx') -Directory) {
        $cloudManifestPath = Join-Path $cloudPackage.FullName "node_modules/$Provider/package.json"
        if (-not (Test-Path -LiteralPath $cloudManifestPath -PathType Leaf)) { continue }
        $cloudManifest = Get-Content -LiteralPath $cloudManifestPath -Raw | ConvertFrom-Json
        if ($cloudManifest.name -ne $Provider -or $cloudManifest.version -ne $cloudVersion) { continue }
        $cloudBin = if ($cloudManifest.bin -is [string]) { $cloudManifest.bin } else { $cloudManifest.bin.$Provider }
        $cloudEntry = Join-Path (Split-Path -Parent $cloudManifestPath) $cloudBin
        break
    }
    if (-not $cloudEntry -or -not (Test-Path -LiteralPath $cloudEntry -PathType Leaf)) {
        throw "The pinned $Provider CLI entry point could not be resolved."
    }
    & $cloudNode.Source $cloudEntry @CloudArguments
    exit $LASTEXITCODE
}

if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() -ne 'X64') {
    throw 'This pinned Render download supports Windows x64 only. Use the official CLI for your architecture.'
}
$cloudRenderVersion = $cloudToolchain.render.version
$cloudRenderDirectory = Join-Path $cloudRepository ".dev-processes/tools/render-$cloudRenderVersion"
$cloudRenderExecutable = Join-Path $cloudRenderDirectory 'render.exe'
if (-not (Test-Path -LiteralPath $cloudRenderExecutable -PathType Leaf)) {
    New-Item -ItemType Directory -Path $cloudRenderDirectory -Force | Out-Null
    $cloudRenderArchive = Join-Path $cloudRenderDirectory 'render-cli.zip'
    $cloudRenderRelease = "https://github.com/render-oss/cli/releases/download/v${cloudRenderVersion}/cli_${cloudRenderVersion}_windows_amd64.zip"
    Invoke-WebRequest -UseBasicParsing -Uri $cloudRenderRelease -OutFile $cloudRenderArchive
    $cloudActualHash = (Get-FileHash -LiteralPath $cloudRenderArchive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($cloudActualHash -ne $cloudToolchain.render.windows_amd64_sha256) {
        throw 'Render CLI checksum mismatch; the downloaded archive will not be executed.'
    }
    Expand-Archive -LiteralPath $cloudRenderArchive -DestinationPath $cloudRenderDirectory -Force
}

& $cloudRenderExecutable @CloudArguments
exit $LASTEXITCODE
