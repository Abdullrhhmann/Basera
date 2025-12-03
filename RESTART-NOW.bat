@echo off
echo ========================================
echo KILLING OLD SERVER AND RESTARTING
echo ========================================
echo.

REM Kill all node processes
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Old server killed!
echo.
echo ========================================
echo NOW STARTING NEW SERVER WITH FIXES
echo ========================================
echo.

cd server
start cmd /k "npm run dev"

echo.
echo ========================================
echo Server starting in new window!
echo ========================================
echo.
echo After server starts:
echo 1. Go to http://localhost:3000
echo 2. Press Ctrl+Shift+R (hard refresh)
echo 3. Click refresh icon in chat
echo 4. Type "wtfffffffffffff"
echo 5. Should show 0 properties!
echo.
pause

