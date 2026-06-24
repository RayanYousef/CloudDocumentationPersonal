# share-wikijs.ps1
# Opens a public ngrok tunnel to the LOCAL Wiki.js instance on port 3000.
#
# Why: this exposes the wiki running on your dev box to the public internet so a
# non-developer can open the URL and try the WYSIWYG editor remotely, without
# installing anything. The public https URL ngrok prints is ALSO the callback
# base URL you'd use later if you test GitHub OAuth login against Wiki.js
# (Wiki.js needs a publicly reachable callback; localhost won't work for that).
#
# WARNING: this is a TEMPORARY tunnel straight to a development machine. Anyone
# with the URL can reach the wiki while the tunnel is open. It is not a
# production deployment, has no real hardening, and the URL changes each run
# (on the free ngrok plan). Close this window (Ctrl+C) to take it down.

$ErrorActionPreference = 'Stop'

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 'ngrok' not found on PATH." -ForegroundColor Red
    Write-Host "Install it, then re-run this script:"
    Write-Host "  - Download:  https://ngrok.com/download   (or:  winget install ngrok.ngrok )"
    Write-Host "  - Sign up for a free account and add your authtoken once:"
    Write-Host "      ngrok config add-authtoken <YOUR_TOKEN>"
    exit 1
}

Write-Host "Starting ngrok tunnel to http://localhost:3000 ..." -ForegroundColor Cyan
Write-Host "Share the https:// 'Forwarding' URL ngrok prints below with your non-dev tester." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to close the tunnel when you're done." -ForegroundColor DarkGray
Write-Host ""

& ngrok http 3000
