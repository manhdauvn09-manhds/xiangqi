#Requires -Version 5.0
# Comprehensive test suite for Xiangqi game deployment
# Tests: Docker containers, API health, Chess Daily puzzles, FEN validation, Nginx config

param(
    [string]$Domain = "xiangqi.games-core.com",
    [string]$OriginIP = "62.238.28.106",
    [string]$SSHUser = "root"
)

$ErrorActionPreference = "Stop"

function Write-Test {
    param([string]$Name, [string]$Status = "PENDING")
    if ($Status -eq "PASS") { Write-Host "[PASS] $Name" -ForegroundColor Green }
    elseif ($Status -eq "FAIL") { Write-Host "[FAIL] $Name" -ForegroundColor Red }
    else { Write-Host "[....] $Name" -ForegroundColor Yellow }
}

function Test-Endpoint {
    param([string]$URL, [string]$Name, [string]$ExpectedString = "", [bool]$SkipSSLCheck = $false)

    Write-Host -NoNewline "[$Name] ... "
    try {
        $response = Invoke-WebRequest -Uri $URL -TimeoutSec 10 -SkipCertificateCheck:$SkipSSLCheck

        if ($ExpectedString -and $response.Content -notmatch $ExpectedString) {
            Write-Host "FAIL (content missing)" -ForegroundColor Red
            return $false
        }

        Write-Host "PASS" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "FAIL" -ForegroundColor Red
        return $false
    }
}

function Test-SSH {
    param([string]$Command, [string]$Name)

    Write-Host -NoNewline "[$Name] ... "
    try {
        $result = ssh "$SSHUser@$OriginIP" $Command 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PASS" -ForegroundColor Green
            return $true
        } else {
            Write-Host "FAIL" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "FAIL" -ForegroundColor Red
        return $false
    }
}

# ======================================================================
Write-Host ""
Write-Host "=== XIANGQI DEPLOYMENT VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

$tests = @()

# Section 1: Docker Containers
Write-Host "1. Docker Containers" -ForegroundColor Blue
$tests += Test-SSH "docker ps --filter 'name=xiangqi-api' --format 'table {{.Names}}' | grep -q xiangqi-api" "xiangqi-api running"
$tests += Test-SSH "docker ps --filter 'name=xiangqi-frontend' --format 'table {{.Names}}' | grep -q xiangqi-frontend" "xiangqi-frontend running"

# Section 2: Port Bindings
Write-Host ""
Write-Host "2. Port Bindings" -ForegroundColor Blue
$tests += Test-SSH "ss -tlnp 2>/dev/null | grep -q ':8787'" "Port 8787 (API) listening"
$tests += Test-SSH "ss -tlnp 2>/dev/null | grep -q ':5500'" "Port 5500 (Frontend) listening"

# Section 3: API Health
Write-Host ""
Write-Host "3. API Health Checks" -ForegroundColor Blue
$tests += Test-Endpoint "https://$OriginIP/api/leaderboard" "API /api/leaderboard" "" $true
$tests += Test-Endpoint "https://$OriginIP/api/daily/puzzle" "API /api/daily/puzzle" "" $true

# Section 4: Frontend Files
Write-Host ""
Write-Host "4. Frontend Files" -ForegroundColor Blue
$tests += Test-Endpoint "https://$OriginIP/" "GET /index.html" "DOCTYPE html" $true
$tests += Test-Endpoint "https://$OriginIP/scripts/ui/daily-chess-page.js" "GET /daily-chess-page.js" "" $true

# Section 5: Tier System
Write-Host ""
Write-Host "5. Tier System Implementation" -ForegroundColor Blue
$tests += Test-SSH "grep -q 'const TIERS' /opt/apps/xiangqi/xiangqi/scripts/ui/daily-chess-page.js" "TIERS array defined"
$tests += Test-SSH "grep -q 'function getTierByLevel' /opt/apps/xiangqi/xiangqi/scripts/ui/daily-chess-page.js" "getTierByLevel function"
$tests += Test-SSH "grep -q 'function showTutorial' /opt/apps/xiangqi/xiangqi/scripts/ui/daily-chess-page.js" "showTutorial function"

# Section 6: Puzzle Data
Write-Host ""
Write-Host "6. Puzzle Data" -ForegroundColor Blue
$tests += Test-SSH "grep -q 'export const PUZZLE_BANK' /opt/apps/xiangqi/xiangqi/scripts/puzzles/bank.js" "PUZZLE_BANK exported"
$tests += Test-SSH "grep -q 'id: .p001' /opt/apps/xiangqi/xiangqi/scripts/puzzles/bank.js" "p001 (Rook-Cannon) exists"
$tests += Test-SSH "grep -q 'id: .p007' /opt/apps/xiangqi/xiangqi/scripts/puzzles/bank.js" "p007 (Rook-Horse) exists"

# Section 7: Nginx Config
Write-Host ""
Write-Host "7. Nginx Configuration" -ForegroundColor Blue
$tests += Test-SSH "nginx -T 2>&1 | grep -q 'xiangqi_api'" "upstream xiangqi_api defined"
$tests += Test-SSH "systemctl is-active nginx | grep -q active" "Nginx service running"

# Section 8: Chess Daily Puzzles (New)
Write-Host ""
Write-Host "8. Chess Daily Puzzles" -ForegroundColor Blue
$tests += Test-SSH "grep -q 'export const ALL_CHESS_PUZZLES' /opt/apps/xiangqi/xiangqi/scripts/puzzles/chess-bank.js" "Chess puzzles array exported"
$tests += Test-SSH "grep -q 'Smothered Mate Pattern' /opt/apps/xiangqi/xiangqi/scripts/puzzles/chess-bank.js" "Chess puzzle data present"
$tests += Test-SSH "grep -q 'parseFen' /opt/apps/xiangqi/xiangqi/scripts/chess/chess-mini.js" "FEN parser exists"
$tests += Test-SSH "grep -q 'renderDailyChessPage' /opt/apps/xiangqi/xiangqi/scripts/ui/daily-chess-page.js" "Chess Daily renderer exists"

# Section 9: FEN Validation (New)
Write-Host ""
Write-Host "9. FEN String Validation" -ForegroundColor Blue
$tests += Test-SSH "grep 'fen.*/' /opt/apps/xiangqi/xiangqi/scripts/puzzles/chess-bank.js | awk -F'/' '{print NF-1}' | sort -u | grep -qx 7" "All FEN strings have 8 ranks"
$tests += Test-SSH "grep -c 'rows\[r\] is not iterable' /opt/apps/xiangqi/xiangqi/scripts/chess/chess-mini.js" "FEN parser has error handling"

# Summary
Write-Host ""
Write-Host "=== TEST SUMMARY ===" -ForegroundColor Cyan
$passed = ($tests | Where-Object { $_ -eq $true } | Measure-Object).Count
$failed = ($tests | Where-Object { $_ -eq $false } | Measure-Object).Count
$total = $tests.Count

Write-Host "Passed: $passed / Failed: $failed / Total: $total"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEPS:"
    Write-Host "1. Clear Cloudflare cache: https://dash.cloudflare.com"
    Write-Host "2. Visit https://xiangqi.games-core.com/daily-chess"
    Write-Host "3. Check for:"
    Write-Host "   - Tier badge (emoji + level + name)"
    Write-Host "   - Progress bar below header"
    Write-Host "   - Question mark (?) button in header"
    Write-Host "   - Tutorial modal on first visit"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[FAILED] Some tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Debug steps:"
    Write-Host "1. Check container logs: ssh root@$OriginIP 'docker logs xiangqi-api'"
    Write-Host "2. Check Nginx errors: ssh root@$OriginIP 'tail -50 /var/log/nginx/xiangqi.games-core.com.error.log'"
    Write-Host "3. Verify file exists: ssh root@$OriginIP 'ls -la /opt/apps/xiangqi/xiangqi/scripts/ui/daily-chess-page.js'"
    Write-Host ""
}

Write-Host "=== END VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""
