@echo off
echo ============================================================
echo   ARGUS PLATFORM - Running Full Stack (Backend + Frontend)
echo ============================================================
echo.
echo [1/2] Launching Spring Boot Backend (Port 8090)...
start "Argus Backend (Spring Boot)" cmd /k "cd /d %~dp0backend && mvnw.cmd spring-boot:run"

echo [2/2] Launching Modern Product Frontend (Port 5173)...
start "Argus Frontend (Vite + React)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo   Argus Platform is launching!
echo.
echo   Frontend URL: http://localhost:5173
echo   Backend URL:  http://localhost:8090
echo ============================================================
echo.
pause
