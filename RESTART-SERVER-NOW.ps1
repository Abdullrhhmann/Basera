Write-Host "========================================" -ForegroundColor Red
Write-Host "  STOPPING OLD SERVER & RESTARTING" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Step 1: Kill all Node processes (to ensure clean restart)
Write-Host "[1/3] Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "  ✅ All old Node processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Verify environment file exists
Write-Host "[2/3] Verifying environment configuration..." -ForegroundColor Yellow
if (Test-Path "server\.env") {
    Write-Host "  ✅ server\.env exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Creating server\.env from env.development..." -ForegroundColor Yellow
    Copy-Item env.development server\.env -Force
    Write-Host "  ✅ server\.env created" -ForegroundColor Green
}
Write-Host ""

# Step 3: Instructions to start
Write-Host "[3/3] Ready to start with NEW code!" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NOW RUN THESE COMMANDS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "TERMINAL 1 (Backend - NEW CODE):" -ForegroundColor White
Write-Host "  cd server" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "TERMINAL 2 (Frontend):" -ForegroundColor White
Write-Host "  cd client" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Red
Write-Host "  The OLD server has been killed." -ForegroundColor White
Write-Host "  Start the NEW server with the commands above." -ForegroundColor White
Write-Host ""
Write-Host "THEN TEST:" -ForegroundColor Red
Write-Host "  1. Go to http://localhost:3000" -ForegroundColor White
Write-Host "  2. Clear browser cache (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "  3. Open chat" -ForegroundColor White
Write-Host "  4. Type 'asdfA' - should ask to clarify, NO properties" -ForegroundColor White
Write-Host "  5. Type 'show me apartments' - SHOULD show properties" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Old processes killed! Ready for restart!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

