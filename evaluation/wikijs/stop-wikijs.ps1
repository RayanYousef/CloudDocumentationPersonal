# stop-wikijs.ps1
# Stops the local Wiki.js evaluation stack.
#   .\stop-wikijs.ps1          -> stops containers, KEEPS the database (resume later with start-wikijs.ps1).
#   .\stop-wikijs.ps1 -Wipe    -> stops AND deletes volumes (Postgres data + uploads). Fresh start next time.

param(
    [switch]$Wipe
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 'docker' CLI not found - nothing to stop." -ForegroundColor Red
    exit 1
}

Set-Location -Path $PSScriptRoot

if ($Wipe) {
    Write-Host "[WARNING] -Wipe will DELETE the Wiki.js database volume." -ForegroundColor Yellow
    Write-Host "All pages, users, and the admin account you created will be PERMANENTLY removed." -ForegroundColor Yellow
    Write-Host "Tearing down stack and removing volumes (docker compose down -v)..." -ForegroundColor Cyan
    & docker compose down -v
} else {
    Write-Host "Stopping stack but KEEPING data (docker compose down)..." -ForegroundColor Cyan
    Write-Host "Your pages and admin account are preserved. Re-run .\start-wikijs.ps1 to resume."
    & docker compose down
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] 'docker compose down' failed. See output above." -ForegroundColor Red
    exit 1
}

Write-Host "Done." -ForegroundColor Green
