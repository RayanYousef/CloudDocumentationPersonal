<#
.SYNOPSIS
    Production-build the Docusaurus site, then serve it locally (the SSR gate).

.DESCRIPTION
    Runs `npm run build` (the real static build that catches SSR errors such as
    "window is not defined" - the failure mode the /editor page must never cause),
    then `npm run serve` to smoke-test the production output locally.

    Run it:  .\scripts\build-site.ps1
    Stop the preview server: Ctrl+C.
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$siteDir  = Join-Path $repoRoot 'website'

Write-Host "== Unity Cloud Build Docs - production build + serve ==" -ForegroundColor Cyan

# --- Prerequisite: Node >= 20 -------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js was not found on PATH. Install Node >= 20 from https://nodejs.org." -ForegroundColor Red
    exit 1
}
$nodeVersion = (& node --version).TrimStart('v')
$nodeMajor   = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20) {
    Write-Host "Node $nodeVersion found, but Docusaurus 3 needs Node >= 20." -ForegroundColor Red
    exit 1
}

# --- Install dependencies if needed ------------------------------------------
$nodeModules = Join-Path $siteDir 'node_modules'
if (-not (Test-Path $nodeModules)) {
    Write-Host "node_modules missing - running 'npm ci'..." -ForegroundColor Yellow
    Push-Location $siteDir
    try { & npm ci } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { Write-Host "npm ci failed." -ForegroundColor Red; exit 1 }
}

# --- Build (the SSR gate) -----------------------------------------------------
Write-Host "Building static site (this is the SSR gate)..." -ForegroundColor Cyan
Push-Location $siteDir
try { & npm run build } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED. Fix the error above before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "Build succeeded." -ForegroundColor Green

# --- Serve the production build ----------------------------------------------
Write-Host ""
Write-Host "Serving production build..." -ForegroundColor Cyan
Write-Host "  Site   : http://localhost:3000/CloudDocumentationPersonal/" -ForegroundColor Green
Write-Host "  Editor : http://localhost:3000/CloudDocumentationPersonal/editor/" -ForegroundColor Green
Write-Host "  (Ctrl+C to stop)" -ForegroundColor DarkGray
Write-Host ""

Push-Location $siteDir
try { & npm run serve } finally { Pop-Location }
