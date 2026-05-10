# Cờ Tướng Vương — Direct Server Deployment (No Local Build Test)
# Usage: .\deploy-direct.ps1

param(
    [string]$ServerUser = "root",
    [string]$ServerHost = "62.238.28.106",
    [string]$ServerPath = "/opt/apps/xiangqi",
    [string]$GitRepo = "https://github.com/manhdauvn09-manhds/xiangqi.git"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-Status {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[$Timestamp] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Status $Message "Green"
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Status $Message "Red"
    exit 1
}

try {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Cờ Tướng Vương — Direct Deploy" -ForegroundColor Cyan
    Write-Host "  Server: $ServerHost" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Check Git
    Write-Status "Checking Git..." "Yellow"
    try {
        git --version > $null 2>&1
        Write-Success "[OK] Git ready"
    }
    catch {
        Write-ErrorMsg "Git not found"
    }

    # Check SSH
    Write-Status "Checking SSH..." "Yellow"
    try {
        ssh -V 2>&1 | Out-Null
        Write-Success "[OK] SSH ready"
    }
    catch {
        Write-ErrorMsg "SSH not found"
    }

    # Commit changes
    Write-Status "Committing changes..." "Yellow"
    cd $RootDir
    $status = git status --porcelain
    if ($status) {
        git add -A
        $commitMsg = "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $commitMsg
        Write-Success "[OK] Committed"
    } else {
        Write-Success "[OK] No changes to commit"
    }

    # Push to GitHub
    Write-Status "Pushing to GitHub..." "Yellow"
    git push -u origin HEAD:main
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Git push failed"
    }
    Write-Success "[OK] Pushed to GitHub"

    # Deploy to server
    Write-Status "Deploying to server..." "Yellow"
    $ServerAddr = "$ServerUser@$ServerHost"

    # Test SSH
    Write-Status "Testing SSH connection..." "Cyan"
    ssh -o ConnectTimeout=10 $ServerAddr "echo OK" > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Cannot connect to $ServerAddr"
    }
    Write-Success "[OK] SSH OK"

    # Pull latest code
    Write-Status "Pulling latest code..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && git pull origin main" | Tee-Object -FilePath "$RootDir\deploy.log"
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Git pull failed"
    }
    Write-Success "[OK] Code pulled"

    # Build Docker image
    Write-Status "Building Docker image on server..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker build -f Dockerfile.prod -t xiangqi:prod ." | Tee-Object -FilePath "$RootDir\deploy.log" -Append
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Build failed"
    }
    Write-Success "[OK] Image built"

    # Restart service
    Write-Status "Restarting service..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker-compose -f docker-compose-prod.yml down && docker-compose -f docker-compose-prod.yml up -d" | Tee-Object -FilePath "$RootDir\deploy.log" -Append
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Service restart failed"
    }
    Write-Success "[OK] Service restarted"

    # Health check
    Write-Status "Health checking..." "Cyan"
    Start-Sleep -Seconds 5

    $maxAttempts = 10
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "https://xiangqi.games-core.com/api/leaderboard" `
                -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "[OK] API healthy"
                break
            }
        }
        catch {
            $attempt++
            if ($attempt -lt $maxAttempts) {
                Write-Status "  Check $attempt/$maxAttempts..." "Cyan"
                Start-Sleep -Seconds 2
            }
        }
    }

    if ($attempt -eq $maxAttempts) {
        Write-ErrorMsg "Health check failed"
    }

    Write-Host ""
    Write-Success "[SUCCESS] Deploy complete!"
    Write-Host "LIVE: https://xiangqi.games-core.com" -ForegroundColor Green
    Write-Host ""

}
catch {
    Write-ErrorMsg $_.Exception.Message
}
