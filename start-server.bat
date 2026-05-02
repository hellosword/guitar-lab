@echo off
setlocal

cd /d "%~dp0"

if "%HOST%"=="" set "HOST=127.0.0.1"
if "%PORT%"=="" set "PORT=4173"
set "URL=http://%HOST%:%PORT%"

title Guitar Lab Server - %URL%

echo Guitar Lab server
echo URL: %URL%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$client = [System.Net.Sockets.TcpClient]::new(); try { $client.Connect($env:HOST, [int]$env:PORT); $client.Close(); exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  echo Server is already running at %URL%
  echo.
  echo Close the existing server window if you want to stop it.
  echo This window will not start a second server.
  echo.
  pause
  exit /b 0
)

if not exist "dist\index.html" (
  echo dist was not found. Building the app first...
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo Build failed. Server was not started.
    pause
    exit /b 1
  )
  echo.
)

echo Starting server...
echo Keep this window open while using the app.
echo Close this window or press Ctrl+C to stop the server.
echo.

call npm run preview:static
