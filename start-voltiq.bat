@echo off
title VoltIQ AI

cd /d "%~dp0"

echo.
echo ========================================
echo        VoltIQ AI Starting...
echo ========================================
echo.

start "" cmd /k "npm run dev"

echo Waiting for VoltIQ AI to start...
timeout /t 5 /nobreak >nul

start "" http://localhost:3000

echo.
echo VoltIQ AI is running.
echo Browser opened at http://localhost:3000
echo.
