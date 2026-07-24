@echo off
echo ========================================
echo Starting EOD Management System
echo ========================================
echo.
echo This will start both Backend and Frontend servers
echo.
echo Backend: http://localhost:8080
echo Frontend: http://localhost:23881
echo.
echo Press Ctrl+C to stop the servers
echo ========================================
echo.

REM Start Backend in a new window
start "EOD Backend Server" cmd /k "cd /d %~dp0 && start-backend.bat"

REM Wait 5 seconds for backend to start
timeout /t 5 /nobreak

REM Start Frontend in a new window
start "EOD Frontend Server" cmd /k "cd /d %~dp0 && start-frontend.bat"

echo.
echo ========================================
echo Both servers are starting...
echo.
echo Backend Server: Check "EOD Backend Server" window
echo Frontend Server: Check "EOD Frontend Server" window
echo.
echo Open your browser at: http://localhost:23881
echo ========================================
