@echo off
echo ========================================
echo Starting EOD Management Backend Server
echo ========================================
echo.

cd artifacts\api-server

echo Building backend...
call node build.mjs

echo.
echo Starting server on port 8080...
echo.

set PORT=8080
set DATABASE_URL=postgresql://postgres:Shiny@08@localhost:5432/eod_db

node dist\index.mjs
