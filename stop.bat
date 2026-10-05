@echo off
setlocal
title Argus - Server Stopper

echo ========================================================
echo              Stopping Argus Backend
echo ========================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8090 ^| findstr LISTENING') do (
    set FOUND=1
    echo [*] Terminating process PID %%a listening on port 8090...
    taskkill /f /pid %%a >nul 2>&1
)

if "%FOUND%"=="0" (
    echo [*] No process found listening on port 8090.
) else (
    echo [SUCCESS] Argus backend on port 8090 has been stopped.
)

echo.
timeout /t 2 >nul
