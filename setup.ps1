# Komandorr Dashboard Setup Script
# This script sets up both backend and frontend dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Komandorr Dashboard Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ========================================
# Backend Setup
# ========================================
Write-Host "Setting up Backend..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$ScriptDir\backend"

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8 or higher from https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    Write-Host "Virtual environment created!" -ForegroundColor Green
} else {
    Write-Host "Virtual environment already exists." -ForegroundColor Green
}

# Activate virtual environment and install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backend dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Error installing backend dependencies" -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
    Write-Host ".env file created!" -ForegroundColor Green
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "Logs directory created!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Backend setup complete!" -ForegroundColor Green
Write-Host ""

# ========================================
# Frontend Setup
# ========================================
Write-Host "Setting up Frontend..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$ScriptDir\frontend"

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Found Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "Found npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: npm is not installed" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Error installing frontend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Frontend setup complete!" -ForegroundColor Green
Write-Host ""

# ========================================
# Summary
# ========================================
Set-Location $ScriptDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start Backend:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   python run.py" -ForegroundColor Gray
Write-Host "   Backend will run on: http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "2. Start Frontend (in new terminal):" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "   Frontend will run on: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Or use the start scripts:" -ForegroundColor Yellow
Write-Host "   .\start-backend.ps1" -ForegroundColor Gray
Write-Host "   .\start-frontend.ps1" -ForegroundColor Gray
Write-Host ""
