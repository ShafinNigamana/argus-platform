@echo off
echo ============================================================
echo   ARGUS - Enterprise Backend (Spring Boot 3.5 / Java 21)
echo ============================================================
echo.
cd /d "%~dp0backend"

echo Starting Spring Boot Backend on http://localhost:8090 ...
echo Press Ctrl+C to stop.
echo.

REM Ensure port 8090 is free before starting
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8090 ^| findstr LISTENING') do (
    echo [*] Freeing port 8090: terminating lingering process PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

call mvnw.cmd spring-boot:run
