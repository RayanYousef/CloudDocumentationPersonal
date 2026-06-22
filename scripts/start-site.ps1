<#
.SYNOPSIS
    Start the Docusaurus site locally with hot reload and print the editor URL.

.DESCRIPTION
    Verifies Node >= 20 is installed, installs dependencies if node_modules is
    missing, then runs `npm run start` from the website/ folder. The custom
    in-browser WYSIWYG editor lives at /editor.

    Run it:  .\scripts\start-site.ps1
    Stop it: Ctrl+C in this window.
#>

$ErrorActionPreference = 'Stop'

# Repo root = parent of this scripts/ folder; website/ holds the Docusaurus app.
$repoRoot = Split-Path -Parent $PSScriptRoot
$siteDir  = Join-Path $repoRoot 'website'

Write-Host "== Unity Cloud Build Docs - local dev server ==" -ForegroundColor Cyan

# --- Prerequisite: Node >= 20 -------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js was not found on PATH." -ForegroundColor Red
    Write-Host "Install Node >= 20 from https://nodejs.org and re-run this script." -ForegroundColor Yellow
    exit 1
}

$nodeVersion = (& node --version).TrimStart('v')   # e.g. 20.11.1
$nodeMajor   = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20) {
    Write-Host "Node $nodeVersion found, but Docusaurus 3 needs Node >= 20." -ForegroundColor Red
    Write-Host "Upgrade from https://nodejs.org and re-run this script." -ForegroundColor Yellow
    exit 1
}
Write-Host "Node $nodeVersion OK." -ForegroundColor Green

# --- Install dependencies if needed ------------------------------------------
$nodeModules = Join-Path $siteDir 'node_modules'
if (-not (Test-Path $nodeModules)) {
    Write-Host "node_modules missing - running 'npm ci' (first run, may take a minute)..." -ForegroundColor Yellow
    Push-Location $siteDir
    try { & npm ci } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { Write-Host "npm ci failed." -ForegroundColor Red; exit 1 }
}

# --- Start the dev server -----------------------------------------------------
# baseUrl is /CloudDocumentationPersonal/, so local routes include that prefix.
Write-Host ""
Write-Host "Starting dev server (hot reload)..." -ForegroundColor Cyan
Write-Host "  Site   : http://localhost:3000/CloudDocumentationPersonal/" -ForegroundColor Green
Write-Host "  Editor : http://localhost:3000/CloudDocumentationPersonal/editor/" -ForegroundColor Green
Write-Host "  (Ctrl+C to stop)" -ForegroundColor DarkGray
Write-Host ""

Push-Location $siteDir
try { & npm run start } finally { Pop-Location }
