# MkDocs Documentation Setup

Write-Host "Setting up Komandorr Documentation..." -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Found $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`nInstalling documentation dependencies..." -ForegroundColor Cyan
pip install -r docs/requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Start MkDocs server
Write-Host "`nStarting MkDocs development server..." -ForegroundColor Cyan
Write-Host "Documentation will be available at: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

mkdocs serve
