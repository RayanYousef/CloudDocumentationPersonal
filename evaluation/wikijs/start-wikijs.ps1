# start-wikijs.ps1
# Boots the local Wiki.js evaluation stack (Wiki.js + Postgres) via docker compose,
# waits for the web UI to respond, then opens it in your default browser.
# LOCAL EVALUATION ONLY - this is for judging Wiki.js's WYSIWYG editor.

$ErrorActionPreference = 'Stop'

# 1. Make sure the Docker CLI is installed.
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 'docker' CLI not found." -ForegroundColor Red
    Write-Host "Install Docker Desktop from https://www.docker.com/products/docker-desktop/ and reopen PowerShell."
    exit 1
}

# 2. Make sure the Docker engine is actually running ('docker info' fails if the daemon is down).
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker engine is not running." -ForegroundColor Red
    Write-Host "Start Docker Desktop:"
    Write-Host "  - Open the 'Docker Desktop' app from the Start menu and wait until the whale icon says 'Engine running'."
    Write-Host "  - Then re-run:  .\start-wikijs.ps1"
    exit 1
}

# 3. Work from this script's folder so docker-compose.yml is found.
Set-Location -Path $PSScriptRoot

# 4. Bring the stack up in the background.
Write-Host "Starting Wiki.js stack (docker compose up -d)..." -ForegroundColor Cyan
& docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] 'docker compose up -d' failed. See output above." -ForegroundColor Red
    exit 1
}

# 5. Poll the web UI until it answers (Wiki.js + Postgres take a little while on first run).
$url = 'http://localhost:3000'
$timeoutSeconds = 120
$elapsed = 0
$ready = $false

Write-Host "Waiting for $url to come up (up to $timeoutSeconds s)..." -ForegroundColor Cyan
while ($elapsed -lt $timeoutSeconds) {
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
            $ready = $true
            break
        }
    } catch {
        # Not up yet - keep waiting.
    }
    Start-Sleep -Seconds 3
    $elapsed += 3
    Write-Host "  ... still waiting ($elapsed s)" -ForegroundColor DarkGray
}

if (-not $ready) {
    Write-Host "[WARN] $url did not respond within $timeoutSeconds s." -ForegroundColor Yellow
    Write-Host "The containers may still be initializing. Check status with:  docker compose ps"
    Write-Host "And logs with:  docker compose logs -f wiki"
    exit 1
}

# 6. Open the browser and explain the first-run wizard.
Write-Host "Wiki.js is up!" -ForegroundColor Green
Start-Process $url

Write-Host ""
Write-Host "On FIRST run, Wiki.js shows a setup wizard in the browser." -ForegroundColor Cyan
Write-Host "You will set the ADMIN EMAIL and ADMIN PASSWORD there - there is no default login."
Write-Host "Pick anything you like (e.g. admin@example.com); it is only stored in the local Postgres container."
Write-Host ""
Write-Host "After that: create a new page and choose the 'Visual Editor' to evaluate the WYSIWYG experience."
