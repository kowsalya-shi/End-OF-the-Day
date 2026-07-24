@echo off
echo ============================================
echo   EOD Portal - Development Server Starter
echo ============================================
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo.
    echo Please edit .env with your database credentials
    echo Then run this script again.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    pnpm install --ignore-scripts
    echo.
)

echo.
echo Choose what to start:
echo.
echo 1. API Server only (port 8080)
echo 2. Frontend only (port 23881)
echo 3. Both (recommended)
echo 4. Check database connection
echo 5. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto api
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto both
if "%choice%"=="4" goto checkdb
if "%choice%"=="5" exit /b 0

:api
echo.
echo Starting API Server...
echo API will be available at http://localhost:8080/api
echo.
cd artifacts\api-server
pnpm run dev
goto end

:frontend
echo.
echo Starting Frontend...
echo Frontend will be available at http://localhost:23881
echo.
cd artifacts\eod-portal
pnpm run dev
goto end

:both
echo.
echo Starting both servers...
echo.
echo Opening API Server in new window...
start "EOD API Server" cmd /k "cd artifacts\api-server && pnpm run dev"
timeout /t 3 /nobreak > nul
echo Opening Frontend in new window...
start "EOD Frontend" cmd /k "cd artifacts\eod-portal && pnpm run dev"
echo.
echo Both servers are starting...
echo API: http://localhost:8080/api
echo Frontend: http://localhost:23881
echo.
pause
goto end

:checkdb
echo.
echo Checking database connection...
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { if (err) { console.error('Database connection failed:', err.message); process.exit(1); } console.log('Database connected successfully!'); console.log('Current time:', res.rows[0].now); pool.end(); });"
echo.
pause
goto end

:end
