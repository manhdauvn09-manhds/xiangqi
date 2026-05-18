#Requires -Version 5.0
# Clear Cloudflare cache for xiangqi.games-core.com

param(
    [Parameter(Mandatory=$true)]
    [string]$APIToken,

    [string]$ZoneID = "9f8c4e8b5d2a1c6e",
    [string]$Domain = "xiangqi.games-core.com"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Cloudflare Cache Purge ===" -ForegroundColor Cyan
Write-Host ""

if (-not $APIToken -or $APIToken -eq "your_token") {
    Write-Host "ERROR: Need valid Cloudflare API Token" -ForegroundColor Red
    Write-Host ""
    Write-Host "Get token from: https://dash.cloudflare.com/profile/api-tokens"
    Write-Host ""
    Write-Host "Usage: .\clear-cloudflare-cache.ps1 -APIToken 'your_actual_token_here'"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $APIToken"
    "Content-Type" = "application/json"
}

$filesToPurge = @(
    "https://$Domain/",
    "https://$Domain/index.html",
    "https://$Domain/scripts/ui/daily-chess-page.js",
    "https://$Domain/scripts/puzzles/bank.js",
    "https://$Domain/scripts/main.js"
)

Write-Host "[1/2] Purging specific files..." -ForegroundColor Yellow

$body = @{
    files = $filesToPurge
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneID/purge_cache" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body `
                                  -TimeoutSec 10

    if ($response.success) {
        Write-Host "SUCCESS: Files purged" -ForegroundColor Green
        foreach ($file in $filesToPurge) {
            Write-Host "  - $file"
        }
    } else {
        Write-Host "FAILED: $($response.errors[0].message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/2] Optional: Full cache clear..." -ForegroundColor Yellow
$confirm = Read-Host "Purge ALL cached files? (y/n)"

if ($confirm -eq 'y' -or $confirm -eq 'yes') {
    $body = @{
        purge_everything = $true
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneID/purge_cache" `
                                      -Method POST `
                                      -Headers $headers `
                                      -Body $body `
                                      -TimeoutSec 10

        if ($response.success) {
            Write-Host "SUCCESS: Full cache purged" -ForegroundColor Green
        } else {
            Write-Host "FAILED: $($response.errors[0].message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Cache clear complete ===" -ForegroundColor Green
Write-Host "Files should be fresh within 30 seconds"
Write-Host ""
