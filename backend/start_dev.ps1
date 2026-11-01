# Development startup script for Seka Kama backend
Write-Host "=== Seka Kama Backend - Development Mode ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.template to .env and configure it." -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& ".\.venv\Scripts\Activate.ps1"

# Show current directory
Write-Host "Working directory: $PWD" -ForegroundColor Cyan

# Check Python version
Write-Host "Python version:" -ForegroundColor Cyan
python --version

# Install/update dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Green
pip install -r requirements.txt -q

# Show CORS configuration
Write-Host ""
Write-Host "CORS Configuration:" -ForegroundColor Cyan
$allowedOrigins = [Environment]::GetEnvironmentVariable("ALLOWED_ORIGINS", "Process")
if ($allowedOrigins) {
    Write-Host "  ALLOWED_ORIGINS: $allowedOrigins" -ForegroundColor Yellow
} else {
    Write-Host "  ALLOWED_ORIGINS: (not set - will use defaults)" -ForegroundColor Yellow
}

# Start the server with detailed logging
Write-Host ""
Write-Host "Starting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level info
