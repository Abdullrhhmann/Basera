# Check if servers are running
Write-Host "Checking Basira Real Estate servers..." -ForegroundColor Green
Write-Host ""

# Check backend (port 5001)
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend Server: RUNNING (http://localhost:5001)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Server: NOT RUNNING" -ForegroundColor Red
}

# Check frontend (port 3000)
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend Server: RUNNING (http://localhost:3000)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend Server: NOT RUNNING" -ForegroundColor Red
}

Write-Host ""
Write-Host "If servers are running, you can access:" -ForegroundColor Yellow
Write-Host "🌐 Website: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 API: http://localhost:5001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "If servers are not running, check the terminal windows for errors." -ForegroundColor Yellow
