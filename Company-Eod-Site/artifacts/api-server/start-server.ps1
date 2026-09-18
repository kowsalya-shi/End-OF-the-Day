# Start EOD API Server with Email Configuration
# This script sets environment variables and starts the server

Write-Host "🚀 Starting EOD API Server..." -ForegroundColor Cyan
Write-Host "📧 Loading email configuration..." -ForegroundColor Yellow

# Load .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
        if ($name -like "SMTP*" -and $name -ne "SMTP_PASSWORD") {
            Write-Host "  ✓ $name = $value" -ForegroundColor Green
        } elseif ($name -eq "SMTP_PASSWORD") {
            Write-Host "  ✓ SMTP_PASSWORD = ***" -ForegroundColor Green
        }
    }
}

Write-Host "`n✅ Email configuration loaded!" -ForegroundColor Green
Write-Host "📡 Starting server on port $env:PORT..." -ForegroundColor Cyan
Write-Host ""

# Start the server
node dist\index.mjs
