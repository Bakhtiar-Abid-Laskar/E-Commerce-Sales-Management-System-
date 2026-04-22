@echo off
title SalesTracker — Dev Server
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       SalesTracker Dev Server            ║
echo  ║   Frontend + Backend API on port 3000    ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Kill any process already on port 3000 ─────────────────────────────────────
echo [INFO] Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 "') do (
    set PID=%%a
)
if defined PID (
    echo [INFO] Killing existing process on port 3000 (PID: %PID%)...
    taskkill /PID %PID% /F >nul 2>&1
    timeout /t 1 /nobreak >nul
    set PID=
    echo [INFO] Done.
) else (
    echo [INFO] Port 3000 is free.
)
echo.

:: ── Change to the nextapp directory ───────────────────────────────────────────
cd /d "%~dp0nextapp"

:: ── Install deps if missing ───────────────────────────────────────────────────
if not exist "node_modules\" (
    echo [SETUP] node_modules not found. Running npm install...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check your Node.js installation.
        pause
        exit /b 1
    )
    echo [SETUP] Dependencies installed successfully.
    echo.
)

:: ── Warn if API key is still placeholder ─────────────────────────────────────
findstr /C:"your_gemini_api_key_here" .env.local >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] .env.local still has the placeholder API key.
    echo           Edit: nextapp\.env.local to enable AI label parsing.
    echo.
)

echo [INFO] Starting Next.js dev server...
echo [INFO] Frontend:  http://localhost:3000
echo [INFO] API:       http://localhost:3000/api/parse-label
echo [INFO] Models:    http://localhost:3000/api/list-models
echo.
echo Press Ctrl+C to stop the server.
echo.

:: Open browser after 3s
start "" /B cmd /C "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start dev server
npm run dev

pause
