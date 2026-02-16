<#
run-dev.ps1
Helper to create a venv (if missing), install backend deps, and open two PowerShell windows:
- one running the FastAPI backend (uvicorn)
- one running the frontend dev server (Vite)

Usage: from repository root run: `.
un-dev.ps1`
#>
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Repository root: $root"

Set-Location $root

if (-not (Test-Path "$root\.venv")) {
    Write-Host "Creating Python venv..."
    python -m venv .venv
    Write-Host "Installing backend requirements..."
    & .\.venv\Scripts\python -m pip install --upgrade pip
    & .\.venv\Scripts\python -m pip install -r backend\requirements.txt
} else {
    Write-Host ".venv already exists. Skipping venv creation."
}

Write-Host "Starting backend in a new PowerShell window (uvicorn on :5050)..."
Start-Process powershell -ArgumentList @('-NoExit','-Command',"Set-Location '$root'; .\\.venv\\Scripts\\python -m uvicorn backend.main:app --reload --port 5050")

Write-Host "Starting frontend in a new PowerShell window (Vite dev)..."
Start-Process powershell -ArgumentList @('-NoExit','-Command',"Set-Location '$root\\frontend'; npm install; npm run dev")

Write-Host "Launched backend and frontend. Keep an eye on the new windows for logs."
