@echo off
echo ============================================================
echo   ARGUS - Modern Security Product Frontend (Vite + React)
echo ============================================================
echo.
cd /d "%~dp0frontend"

if not exist node_modules (
    echo [1/2] Installing dependencies...
    call npm install
)

echo [2/2] Starting frontend dev server at http://localhost:5173 ...
echo Press Ctrl+C to stop.
echo.
call npm run dev
