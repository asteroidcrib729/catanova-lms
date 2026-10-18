[CmdletBinding()]
param(
    [switch]$Publish
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Run in the owner's terminal. Never supply a token through arguments or files.
$repository = 'asteroidcrib729/catanova-lms'
$teamId = 'team_grJesWXYv44pv3DuOPkWPa9z'
$projectId = 'prj_jlPOOmpVvFgNu6HeHPZ4SWHKKEUe'
$github = if ($Publish) { Get-Command gh.exe -ErrorAction Stop } else { $null }
$secureToken = $null
$token = $null
$headers = $null
$tokenPointer = [IntPtr]::Zero
$publisher = $null
$stage = 'input'

try {
    $secureToken = Read-Host 'Paste the actual Vercel token value (hidden, not its name)' -AsSecureString
    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    if ([string]::IsNullOrWhiteSpace($token) -or $token -match '\s' -or
        $token -match '["'']' -or $token -eq 'VERCEL_TOKEN') {
        throw 'Invalid token input.'
    }

    $headers = @{ Authorization = "Bearer $token" }
    $stage = 'Vercel identity'
    $identity = Invoke-RestMethod -Method Get -Uri 'https://api.vercel.com/v2/user' -Headers $headers -TimeoutSec 30
    if (-not $identity.user.id) { throw 'Missing user identity.' }
    Write-Output 'Vercel identity check passed.'

    $stage = 'CataNova project access'
    $project = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/${projectId}?teamId=$teamId" -Headers $headers -TimeoutSec 30
    if ($project.id -ne $projectId -or $project.accountId -ne $teamId) {
        throw 'Unexpected project or team.'
    }
    Write-Output 'CataNova project and team access check passed.'

    if ($Publish) {
        $stage = 'GitHub secret publication'
        $publisher = New-Object System.Diagnostics.Process
        $publisher.StartInfo.FileName = $github.Source
        $publisher.StartInfo.Arguments = "secret set VERCEL_TOKEN --repo $repository --env production"
        $publisher.StartInfo.UseShellExecute = $false
        $publisher.StartInfo.CreateNoWindow = $true
        $publisher.StartInfo.RedirectStandardInput = $true
        $publisher.StartInfo.RedirectStandardOutput = $true
        $publisher.StartInfo.RedirectStandardError = $true
        if (-not $publisher.Start()) { throw 'Secret publisher did not start.' }
        $outputTask = $publisher.StandardOutput.ReadToEndAsync()
        $errorTask = $publisher.StandardError.ReadToEndAsync()
        $publisher.StandardInput.Write($token)
        $publisher.StandardInput.Close()
        $publisher.WaitForExit()
        # Never echo external output from a command handling a credential.
        $outputTask.GetAwaiter().GetResult() | Out-Null
        $errorTask.GetAwaiter().GetResult() | Out-Null
        if ($publisher.ExitCode -ne 0) { throw 'Secret publication failed.' }
        Write-Output 'Updated production VERCEL_TOKEN in asteroidcrib729/catanova-lms. No deployment was triggered.'
    } else {
        Write-Output 'Verification only. Run again with -Publish to save the verified token in GitHub.'
    }
} catch {
    # Do not expose exception objects, request headers, response bodies or tokens.
    Write-Output "Failed at: $stage. No token value was logged."
    if ($stage -eq 'Vercel identity') {
        Write-Output 'Vercel did not accept this token for a user identity. Check the actual generated value and account; contact Vercel support if a fresh personal access token also fails.'
    }
    throw 'Vercel CI token setup did not complete. GitHub is updated only after both Vercel checks pass.'
} finally {
    $headers = $null
    $token = $null
    if ($tokenPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
    }
    if ($secureToken) { $secureToken.Dispose() }
    if ($publisher) { $publisher.Dispose() }
}
