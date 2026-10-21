@echo off
REM ============================================================================
REM Hospital Residential Allocation & Management System
REM শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
REM Windows Central LAN Server Startup Script
REM ============================================================================

TITLE SSNIMCH Residential Allocation Central Server (Port 3000)
cd /d "%~dp0.."

echo ============================================================================
echo   Shahid Syed Nazrul Islam Medical College Hospital, Kishoreganj
echo   Hospital Residential Allocation ^& Management System - Central LAN Server
echo ============================================================================
echo.

SET NODE_ENV=production
SET PORT=3000

echo [INFO] Starting Central Backend Server on Port %PORT%...
npx tsx server.ts

pause
