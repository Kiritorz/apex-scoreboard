@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-control.ps1" open
if errorlevel 1 (
  echo.
  pause
)
