# InfraScan - Full Demo Startup Script (Windows)
# Starts: Backend API + MAVLink Bridge + Frontend

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "==================================================="
Write-Host "         InfraScan Demo Startup (Windows)          "
Write-Host "==================================================="
Write-Host ""

Write-Host "Starting Backend Services..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python mavlink_bridge.py"

Write-Host "Starting Frontend Service..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "All services started in separate windows!"
Write-Host "  Frontend    -> http://localhost:5173"
Write-Host "  Backend API -> http://localhost:8000"
Write-Host "  API Docs    -> http://localhost:8000/docs"
Write-Host "  MAVLink     -> http://localhost:8001"
Write-Host "==================================================="
