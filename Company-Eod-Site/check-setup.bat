@echo off
echo ============================================
echo   EOD Portal - Setup Checker
echo ============================================
echo.

set ERRORS=0

REM Check Node.js
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ Node.js is installed
    node --version
) else (
    echo   ✗ Node.js is NOT installed
    echo     Download from: https://nodejs.org/
    set /a ERRORS+=1
)
echo.

REM Check pnpm
echo [2/6] Checking pnpm...
pnpm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ pnpm is installed
    pnpm --version
) else (
    echo   ✗ pnpm is NOT installed
    echo     Run: npm install -g pnpm
    set /a ERRORS+=1
)
echo.

REM Check PostgreSQL
echo [3/6] Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ PostgreSQL is installed
    psql --version
) else (
    echo   ✗ PostgreSQL is NOT installed
    echo     Download from: https://www.postgresql.org/download/
    set /a ERRORS+=1
)
echo.

REM Check .env file
echo [4/6] Checking environment configuration...
if exist .env (
    echo   ✓ .env file exists
    findstr /C:"DATABASE_URL" .env >nul 2>&1
    if %errorlevel% equ 0 (
        echo   ✓ DATABASE_URL is configured
    ) else (
        echo   ✗ DATABASE_URL not found in .env
        set /a ERRORS+=1
    )
) else (
    echo   ✗ .env file NOT found
    echo     Run: copy .env.example .env
    set /a ERRORS+=1
)
echo.

REM Check node_modules
echo [5/6] Checking dependencies...
if exist node_modules (
    echo   ✓ Dependencies are installed
) else (
    echo   ⚠ Dependencies NOT installed
    echo     Run: pnpm install --ignore-scripts
    set /a ERRORS+=1
)
echo.

REM Check database connection
echo [6/6] Checking database connection...
if exist .env (
    node -e "const pg=require('pg');require('dotenv').config();const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});pool.query('SELECT 1',(e)=>{if(e){console.log('  ✗ Database connection FAILED');console.log('    Error:',e.message);process.exit(1)}else{console.log('  ✓ Database connection successful');pool.end()}})" >nul 2>&1
    if %errorlevel% equ 0 (
        node -e "const pg=require('pg');require('dotenv').config();const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});pool.query('SELECT 1',(e)=>{if(e){console.log('  ✗ Database connection FAILED');console.log('    Error:',e.message);process.exit(1)}else{console.log('  ✓ Database connection successful');pool.end()}})"
    ) else (
        echo   ✗ Database connection FAILED
        echo     Check your DATABASE_URL in .env
        set /a ERRORS+=1
    )
) else (
    echo   ⚠ Skipped (no .env file)
)
echo.

REM Summary
echo ============================================
if %ERRORS% equ 0 (
    echo   ✅ All checks passed! Ready to start.
    echo.
    echo   Next steps:
    echo   1. Run: start-dev.bat
    echo   2. Open: http://localhost:23881
    echo.
) else (
    echo   ⚠ Found %ERRORS% issue(s). Please fix them first.
    echo.
    echo   Quick fixes:
    echo   - Install missing software
    echo   - Run: copy .env.example .env
    echo   - Run: pnpm install --ignore-scripts
    echo   - Check PostgreSQL is running
    echo.
)
echo ============================================
pause
