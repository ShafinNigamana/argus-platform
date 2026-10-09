@echo off
echo ============================================================
echo   ARGUS - Enterprise Backend (Spring Boot 3.5 / Java 21)
echo ============================================================
echo.
cd /d "%~dp0backend"

echo Starting Spring Boot Backend on http://localhost:8090 ...
echo Press Ctrl+C to stop.
echo.
call mvnw.cmd spring-boot:run
