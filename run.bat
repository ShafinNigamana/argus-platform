@echo off
setlocal enabledelayedexpansion
title Argus - Backend & Web Launcher

echo ========================================================
echo               Argus Verification Platform
echo ========================================================
echo.
echo [*] Project Root: %~dp0
echo [*] Starting Spring Boot Backend on port 8090...
echo.

cd /d "%~dp0backend"

REM Ensure port 8090 is free before launching
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8090 ^| findstr LISTENING') do (
    echo [*] Freeing port 8090: terminating lingering process PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

REM Launch Spring Boot backend in a separate terminal window
start "Argus Backend Server (Port 8090)" cmd /c "mvnw.cmd spring-boot:run"

echo [*] Waiting for server initialization on http://localhost:8090/ ...
:wait_loop
timeout /t 2 /nobreak >nul
curl.exe -s http://localhost:8090/api/v1/ml/status >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Booting Spring Boot and loading MiniFASNet ONNX model...
    goto wait_loop
)

echo.
echo ========================================================
echo  [SUCCESS] Argus Backend is READY on Port 8090!
echo  [*] Opening Web Application: http://localhost:8090/
echo ========================================================
echo.

REM Automatically open the web app in the default web browser
start http://localhost:8090/

echo To stop the server at any time, run stop.bat or close the backend window.
echo Press any key to stop the server now...
pause >nul
call "%~dp0stop.bat"
