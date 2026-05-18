# Xiangqi Build and Run Script
# Usage:
#   .\build.ps1 -Build      # Build Docker image
#   .\build.ps1 -Run        # Run container
#   .\build.ps1 -Stop       # Stop container
#   .\build.ps1 -Logs       # Show logs
#   .\build.ps1 -Clean      # Remove image and container
#   .\build.ps1 -BuildRun   # Build and Run (default)

param(
    [switch]$Build,
    [switch]$Run,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Clean,
    [switch]$BuildRun,
    [string]$Tag = "xiangqi:latest"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ContainerName = "xiangqi-game"
$ComposeFile = Join-Path $RootDir "docker-compose.yml"

function Write-Status {
    param([string]$Message, [string]$Color = "Cyan")
    $time = [DateTime]::Now.ToString('HH:mm:ss')
    Write-Host "[$time] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Status $Message "Green"
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Status $Message "Red"
}

# Build Docker image
function Build-Image {
    Write-Status "Building Docker image: $Tag" "Yellow"

    if (-not (Test-Path $ComposeFile)) {
        Write-ErrorMsg "docker-compose.yml not found at $ComposeFile"
        exit 1
    }

    docker-compose -f $ComposeFile build
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Build failed!"
        exit 1
    }

    Write-Success "Image built: $Tag"
}

# Run container
function Run-Container {
    Write-Status "Starting container: $ContainerName" "Yellow"

    $running = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
    if ($running) {
        Write-Status "Container already running. Stopping first..." "Cyan"
        docker-compose -f $ComposeFile down
    }

    docker-compose -f $ComposeFile up -d
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Failed to start container!"
        exit 1
    }

    Write-Status "Waiting for services..." "Cyan"
    Start-Sleep -Seconds 3

    Write-Status "Checking API health..." "Cyan"
    $maxAttempts = 20
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8787/api/leaderboard" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "API is ready!"
                break
            }
        }
        catch {
            $attempt++
            if ($attempt -lt $maxAttempts) {
                Write-Status "  Attempt $attempt/$maxAttempts..." "Cyan"
                Start-Sleep -Seconds 1
            }
        }
    }

    if ($attempt -eq $maxAttempts) {
        Write-ErrorMsg "API health check failed after $maxAttempts attempts"
        Write-Status "Check logs with: .\build.ps1 -Logs" "Yellow"
        exit 1
    }

    Write-Host ""
    Write-Success "Services started successfully!"
    Write-Host ""
    Write-Host "==== XIANGQI DOCKER RUNNING ====" -ForegroundColor Green
    Write-Host "Frontend:  http://localhost:5500" -ForegroundColor Green
    Write-Host "API:       http://localhost:8787" -ForegroundColor Green
    Write-Host "WebSocket: ws://localhost:8787/ws" -ForegroundColor Green
    Write-Host ""
    Write-Host "Stop:   .\build.ps1 -Stop" -ForegroundColor Cyan
    Write-Host "Logs:   .\build.ps1 -Logs" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""
}

# Stop container
function Stop-Container {
    Write-Status "Stopping container: $ContainerName" "Yellow"

    docker-compose -f $ComposeFile down
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Failed to stop container!"
        exit 1
    }

    Write-Success "Container stopped"
}

# Show logs
function Show-Logs {
    Write-Status "Showing logs (Ctrl+C to exit)..." "Yellow"
    Write-Host ""
    docker-compose -f $ComposeFile logs -f
}

# Clean everything
function Clean-All {
    Write-Status "Cleaning up image and containers..." "Yellow"

    docker-compose -f $ComposeFile down -v --remove-orphans
    docker rmi $Tag --force 2>$null

    Write-Success "Cleanup complete"
    Write-Status "To rebuild: .\build.ps1 -Build" "Cyan"
}

# Main
try {
    # Default to BuildRun if no params
    if (-not $Build -and -not $Run -and -not $Stop -and -not $Logs -and -not $Clean -and -not $BuildRun) {
        $BuildRun = $true
    }

    if ($BuildRun) {
        Build-Image
        Run-Container
    }
    elseif ($Build) {
        Build-Image
    }
    elseif ($Run) {
        Run-Container
    }
    elseif ($Stop) {
        Stop-Container
    }
    elseif ($Logs) {
        Show-Logs
    }
    elseif ($Clean) {
        Clean-All
    }
}
catch {
    Write-ErrorMsg "Error: $_"
    exit 1
}
