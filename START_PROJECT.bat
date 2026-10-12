@echo off
setlocal
set "ROOT=%~dp0"
title TrafficLens AI - Project Launcher
color 0B

echo.
echo  ============================================================
echo     TRAFFICLENS AI - TRAFFIC CONGESTION PREDICTION
 echo    Random Forest + Gradient Boosting
 echo    KL University - Section 9
 echo  ============================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found. Install Python 3.11+ and try again.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 18+ and try again.
  pause
  exit /b 1
)

cd /d "%ROOT%backend"
if not exist .venv\Scripts\python.exe (
  echo [1/4] Creating Python environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat

echo [2/4] Installing/checking Python packages...
python -m pip install -q -r requirements.txt

start "TrafficLens Backend" /min cmd /k "cd /d "%ROOT%backend" && call .venv\Scripts\activate.bat && python app.py"

cd /d "%ROOT%frontend"
if not exist node_modules (
  echo [3/4] Installing frontend packages...
  npm install --silent
) else (
  echo [3/4] Frontend packages already installed.
)

start "TrafficLens Frontend" /min cmd /k "cd /d "%ROOT%frontend" && npm run dev -- --host 127.0.0.1"

echo [4/4] Waiting for the dashboard...
timeout /t 4 /nobreak >nul
start "" http://localhost:5173

echo.
echo  Dashboard: http://localhost:5173
echo  Backend:   http://localhost:5000
echo.
echo  Keep the two minimized terminal windows running while using the project.
echo.
pause
endlocal
