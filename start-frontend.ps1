# Hospital Dashboard — Start Frontend
# Run this script from the hospital-dashboard directory

Write-Host "================================" -ForegroundColor Cyan
Write-Host " Hospital Diagnostic Dashboard " -ForegroundColor Cyan
Write-Host " Frontend — React + Vite        " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting React dev server on http://localhost:5173 ..." -ForegroundColor Green
Write-Host "Make sure the backend is running on http://localhost:5000" -ForegroundColor Yellow
Write-Host ""

Set-Location "$PSScriptRoot\frontend"
npm run dev
