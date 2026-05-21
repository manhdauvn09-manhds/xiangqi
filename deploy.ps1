# Cờ Tướng Vương — Automated Deployment Script
# Usage:
#   .\deploy.ps1 -FirstSetup        # Initial server setup
#   .\deploy.ps1 -Deploy            # Commit + Push + Deploy
#   .\deploy.ps1 -BuildLocal        # Local build test
#   .\deploy.ps1 -Status            # Check server status

param(
    [switch]$FirstSetup,
    [switch]$Deploy,
    [switch]$BuildLocal,
    [switch]$Status,
    [switch]$SkipLocalTest,
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

function Test-GitInstalled {
    try {
        git --version > $null 2>&1
        Write-Success "[OK] Git installed"
    }
    catch {
        Write-ErrorMsg "Git not found! Install from https://git-scm.com/download/win"
    }
}

function Test-DockerInstalled {
    try {
        docker --version > $null 2>&1
        Write-Success "[OK] Docker installed"
    }
    catch {
        Write-ErrorMsg "Docker not found! Install Docker Desktop"
    }
}

function Test-SshInstalled {
    $sshTest = & cmd /c "where ssh" 2>$null
    if ($sshTest) {
        Write-Success "[OK] SSH installed"
    }
    else {
        Write-ErrorMsg "SSH not found! Enable via 'Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0'"
    }
}

# ============= Git operations =============
function Git-Commit {
    Write-Status "Committing changes to git..." "Yellow"

    cd $RootDir

    # Check if git repo
    if (-not (Test-Path ".git")) {
        Write-Status "Initializing git repository..." "Cyan"
        git init
        git remote add origin $GitRepo
        Write-Status "Git remote set to: $GitRepo" "Cyan"
    }

    # Stage all files
    git add -A
    Write-Status "Staged changes" "Cyan"

    # Check if there are changes
    $status = git status --porcelain
    if (-not $status) {
        Write-Success "No changes to commit"
        return
    }

    # Commit with timestamp
    $commitMsg = "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git commit -m $commitMsg
    Write-Success "[OK] Committed: $commitMsg"
}

function Git-Push {
    Write-Status "Pushing to GitHub..." "Yellow"

    cd $RootDir

    git push -u origin HEAD:main
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Git push failed!"
    }

    Write-Success "[OK] Pushed to GitHub"
}

# ============= Local build test =============
function Test-LocalBuild {
    Write-Status "Testing Docker build locally..." "Yellow"

    cd $RootDir

    docker build -f Dockerfile.prod -t xiangqi:test . 2>&1 | Tee-Object -FilePath "$RootDir\build.log"
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Local build failed! Check build.log"
    }

    Write-Success "[OK] Local build successful"
    docker rmi xiangqi:test
}

# ============= Server deployment =============
function Deploy-ToServer {
    Write-Status "Deploying to $ServerHost..." "Yellow"

    $ServerAddr = "$ServerUser@$ServerHost"

    # ===== Check SSH connectivity =====
    Write-Status "Testing SSH connection..." "Cyan"
    ssh -o ConnectTimeout=10 $ServerAddr "echo OK" > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Cannot connect to $ServerAddr. Check network and SSH keys."
    }
    Write-Success "[OK] SSH connection OK"

    # ===== Pull latest code =====
    Write-Status "Pulling latest code from git..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && git pull origin main" | Tee-Object -FilePath "$RootDir\deploy.log"
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Git pull failed on server!"
    }
    Write-Success "[OK] Code pulled"

    # ===== Build Docker image =====
    Write-Status "Building Docker image on server..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker build -f Dockerfile.prod -t xiangqi:prod ." | Tee-Object -FilePath "$RootDir\deploy.log" -Append
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Docker build failed on server!"
    }
    Write-Success "[OK] Docker image built"

    # ===== Restart service =====
    Write-Status "Restarting service..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker-compose -f docker-compose-prod.yml down && docker-compose -f docker-compose-prod.yml up -d" | Tee-Object -FilePath "$RootDir\deploy.log" -Append
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Service restart failed!"
    }
    Write-Success "[OK] Service restarted"

    # ===== Health check =====
    Write-Status "Running health checks..." "Cyan"
    Start-Sleep -Seconds 5

    $maxAttempts = 10
    $attempt = 0
    $healthCheckPassed = $false
    while ($attempt -lt $maxAttempts) {
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "https://xiangqi.games-core.com/api/leaderboard" `
                -TimeoutSec 15 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "[OK] API health check passed!"
                $healthCheckPassed = $true
                break
            }
        }
        catch {
            if ($attempt -lt $maxAttempts) {
                Write-Status "  Health check attempt $attempt/$maxAttempts - Error: $($_.Exception.Message)" "Yellow"
                Start-Sleep -Seconds 2
            } else {
                Write-Status "  Final attempt failed: $($_.Exception.Message)" "Red"
            }
        }
    }

    if (-not $healthCheckPassed) {
        Write-ErrorMsg "Health check failed after $maxAttempts attempts. Check server logs."
    }

    if ($attempt -eq $maxAttempts) {
        Write-ErrorMsg "Health check failed after $maxAttempts attempts. Check server logs."
    }

    Write-Host ""
    Write-Success "[SUCCESS] Deployment successful!"
    Write-Host ""
    Write-Host "LIVE: https://xiangqi.games-core.com" -ForegroundColor Green
}

# ============= Server status =============
function Check-ServerStatus {
    Write-Status "Checking server status..." "Yellow"

    $ServerAddr = "$ServerUser@$ServerHost"

    # Test connectivity
    Write-Status "Testing SSH..." "Cyan"
    ssh -o ConnectTimeout=10 $ServerAddr "echo OK" > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Cannot connect to server"
    }

    # Get container status
    Write-Status "Container status:" "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker-compose -f docker-compose-prod.yml ps" | Write-Host

    # Get logs
    Write-Status "Recent logs:" "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker-compose -f docker-compose-prod.yml logs --tail 20" | Write-Host

    # Health check
    Write-Status "Testing API endpoint..." "Cyan"
    try {
        $response = Invoke-WebRequest -Uri "https://xiangqi.games-core.com/api/leaderboard" -TimeoutSec 15
        Write-Success "[OK] API is healthy"
    }
    catch {
        Write-ErrorMsg "API health check failed: $_"
    }
}

# ============= First-time setup =============
function Setup-Server {
    Write-Status "Starting first-time server setup..." "Yellow"

    $ServerAddr = "$ServerUser@$ServerHost"

    Write-Status "1. Creating app directory..." "Cyan"
    ssh $ServerAddr "mkdir -p /opt/apps && cd /opt/apps && pwd"

    Write-Status "2. Cloning repository..." "Cyan"
    ssh $ServerAddr "cd /opt/apps && git clone $GitRepo && cd xiangqi && pwd"

    Write-Status "3. Creating .env file with JWT secret..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && SECRET=\$(openssl rand -hex 32) && echo XQ_JWT_SECRET=\$SECRET > .env && chmod 600 .env && echo 'JWT Secret created'"

    Write-Status "4. Building Docker image..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker build -f Dockerfile.prod -t xiangqi:prod ."

    Write-Status "5. Starting containers..." "Cyan"
    ssh $ServerAddr "cd $ServerPath && docker-compose -f docker-compose-prod.yml up -d"

    Write-Status "6. Copying Nginx config..." "Cyan"
    ssh $ServerAddr "cp $ServerPath/nginx-prod.conf /etc/nginx/sites-available/xiangqi.games-core.com"

    Write-Status "7. Enabling Nginx site..." "Cyan"
    ssh $ServerAddr "ln -sf /etc/nginx/sites-available/xiangqi.games-core.com /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"

    Write-Status "8. Setting up SSL with Let's Encrypt..." "Cyan"
    ssh $ServerAddr "which certbot > /dev/null || apt-get update && apt-get install -y certbot python3-certbot-nginx"

    Write-Host ""
    Write-Success "[OK] First-time setup complete!"
    Write-Host ""
    Write-Host "[READY] Server is ready at: https://xiangqi.games-core.com" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Next: .\deploy.ps1 -Deploy" -ForegroundColor Cyan
}

# ============= Main =============
try {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Cờ Tướng Vương — Deployment Panel" -ForegroundColor Cyan
    Write-Host "  Server: $ServerHost" -ForegroundColor Cyan
    Write-Host "  Path: $ServerPath" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Prerequisites
    if ($FirstSetup -or $BuildLocal) {
        Test-GitInstalled
        Test-DockerInstalled
    }
    if ($Deploy -and -not $SkipLocalTest) {
        Test-GitInstalled
        Test-DockerInstalled
    }
    if ($Deploy -or $FirstSetup -or $Status) {
        Test-GitInstalled
        Test-SshInstalled
    }

    # Actions
    if ($FirstSetup) {
        Setup-Server
    }
    elseif ($Deploy) {
        Git-Commit
        Git-Push
        if (-not $SkipLocalTest) {
            Test-LocalBuild
        }
        Deploy-ToServer
    }
    elseif ($BuildLocal) {
        Test-LocalBuild
    }
    elseif ($Status) {
        Check-ServerStatus
    }
    else {
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\deploy.ps1 -FirstSetup                Initial server setup" -ForegroundColor Cyan
        Write-Host "  .\deploy.ps1 -Deploy                    Commit + Deploy + Test build" -ForegroundColor Cyan
        Write-Host "  .\deploy.ps1 -Deploy -SkipLocalTest     Deploy without local test" -ForegroundColor Cyan
        Write-Host "  .\deploy.ps1 -BuildLocal                Test build locally" -ForegroundColor Cyan
        Write-Host "  .\deploy.ps1 -Status                    Check server status" -ForegroundColor Cyan
        Write-Host ""
    }
}
catch {
    $ErrorMsg = $_.Exception.Message
    Write-ErrorMsg "Fatal error: $ErrorMsg"
}
