# Start Both Backend and Frontend
# This script opens two PowerShell windows for backend and frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Komandorr Dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Backend startup script
$BackendScript = @"
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Starting Komandorr Backend' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Set-Location '$ScriptDir\backend'

# Check if virtual environment exists
if (-not (Test-Path 'venv')) {
    Write-Host 'Error: Virtual environment not found!' -ForegroundColor Red
    Write-Host 'Please run setup.ps1 first' -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host 'Activating virtual environment...' -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1

# Check if .env exists
if (-not (Test-Path '.env')) {
    Write-Host 'Warning: .env file not found, using defaults' -ForegroundColor Yellow
}

Write-Host 'Starting FastAPI server...' -ForegroundColor Green
Write-Host 'Backend: http://localhost:8000' -ForegroundColor Green
Write-Host 'API Docs: http://localhost:8000/docs' -ForegroundColor Green
Write-Host ''

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"@

# Frontend startup script
$FrontendScript = @"
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Starting Komandorr Frontend' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Set-Location '$ScriptDir\frontend'

# Check if node_modules exists
if (-not (Test-Path 'node_modules')) {
    Write-Host 'Error: node_modules not found!' -ForegroundColor Red
    Write-Host 'Please run setup.ps1 first' -ForegroundColor Yellow
    exit 1
}

Write-Host 'Starting Vite development server...' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:3000' -ForegroundColor Green
Write-Host ''

# Start the development server
npm run dev
"@

# Start Backend in new window
Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendScript

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend in new window
Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendScript

Write-Host ""
Write-Host "Both services are starting in separate windows!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
