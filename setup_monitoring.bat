@echo off
REM =====================================================
REM Monitoring System Setup Script for Windows / WSL
REM =====================================================

echo.
echo ==============================
echo Starting Monitoring System...
echo ==============================
echo.

REM Navigate to the folder where docker-compose.yml is located
cd /d "%~dp0"

REM Pull required Docker images (optional, speeds up first build)
docker-compose pull

REM Build and start all containers
docker-compose up --build -d

echo.
echo ==============================
echo Monitoring System Started!
echo ==============================
echo.

echo React Dashboard: http://localhost:3000
echo Grafana Dashboard: http://localhost:3001
echo REST API: http://localhost:8080/metrics
echo WebSocket: ws://localhost:9002
echo.

pause
