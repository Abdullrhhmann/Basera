@echo off
echo Starting Basira Real Estate Website...
echo.

echo Step 1: Setting up environment variables...
if not exist .env (
    copy env.development .env
    echo Created .env file from template
    echo Please update .env with your actual values
) else (
    echo .env file already exists
)

echo.
echo Step 2: Starting development servers...
echo Backend will run on http://localhost:5001
echo Frontend will run on http://localhost:3000
echo.

start "Backend Server" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak > nul
start "Frontend Server" cmd /k "cd client && npm start"

echo.
echo Both servers are starting...
echo Check the terminal windows for any errors
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5001/api
echo.
pause
