@echo off
echo ========================================
echo Starting EOD Management Frontend Server
echo ========================================
echo.

cd artifacts\eod-portal

echo Starting Vite dev server on port 23881...
echo.
echo Frontend will be available at: http://localhost:23881
echo.

set PORT=23881
set BASE_PATH=/

npx vite --host 0.0.0.0 --port 23881
