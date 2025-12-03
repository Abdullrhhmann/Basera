# Basira Chatbot Fix and Start Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Basira AI Chatbot - Fix & Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy environment file to server
Write-Host "[1/3] Copying environment variables to server..." -ForegroundColor Yellow
Copy-Item env.development server\.env -Force
Write-Host "  ✅ Environment file copied to server/.env" -ForegroundColor Green
Write-Host ""

# Step 2: Verify API key exists
Write-Host "[2/3] Verifying OpenRouter API key..." -ForegroundColor Yellow
$envContent = Get-Content server\.env | Select-String "OPENROUTER_API_KEY"
if ($envContent -match "sk-or-v1-") {
    Write-Host "  ✅ API key found in server/.env" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  WARNING: API key might not be configured!" -ForegroundColor Red
    Write-Host "  Edit server/.env and add your OpenRouter API key" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Instructions
Write-Host "[3/3] Ready to start!" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. START BACKEND:" -ForegroundColor White
Write-Host "   cd server" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. START FRONTEND (in another terminal):" -ForegroundColor White
Write-Host "   cd client" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "3. OPEN BROWSER:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "4. CLICK purple chat button (bottom-right)" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All fixes applied! Start your servers now." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

