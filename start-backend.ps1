# Hospital Dashboard — Start Backend
# Run this script from the hospital-dashboard directory

Write-Host "================================" -ForegroundColor Cyan
Write-Host " Hospital Diagnostic Dashboard " -ForegroundColor Cyan
Write-Host " PROTOTYPE — Synthetic Data Only" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Flask backend on http://localhost:5000 ..." -ForegroundColor Green

Set-Location "$PSScriptRoot\backend"

# Check Python
$pyVersion = python --version 2>&1
Write-Host "Python: $pyVersion" -ForegroundColor Gray

# Start
python run.py
