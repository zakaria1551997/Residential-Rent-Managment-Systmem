@echo off
SETLOCAL EnableDelayedExpansion
TITLE SSNIMCH Hospital System - Windows 11 EXE Builder
cd /d "%~dp0"

echo ============================================================================
echo   SSNIMCH Hospital Residential Management System - Windows 11 EXE Builder
echo ============================================================================
echo.

REM 1. Get clean project directory path without trailing slash
SET "PROJ_DIR=%~dp0"
IF "%PROJ_DIR:~-1%"=="\" SET "PROJ_DIR=%PROJ_DIR:~0,-1%"

REM 2. Write AppPathConfig.cs so the .exe always knows where the project files are
echo [1/4] Configuring project path for standalone EXE...
(
  echo using System;
  echo namespace SSNIMCHLauncher {
  echo     public static class AppPathConfig {
  echo         public static string GetConfiguredRootDir^(^) {
  echo             return @"%PROJ_DIR%";
  echo         }
  echo     }
  echo }
) > "%~dp0launcher\AppPathConfig.cs"

REM 3. Locate Windows 11 built-in .NET C# Compiler (csc.exe)
SET "CSC_EXE=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
IF NOT EXIST "%CSC_EXE%" (
  SET "CSC_EXE=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

IF NOT EXIST "%CSC_EXE%" (
  echo [ERROR] Microsoft .NET Framework compiler not found at %CSC_EXE%
  pause
  exit /b 1
)

REM 4. Compile SSNIMCH_Hospital_App.exe
echo [2/4] Building SSNIMCH_Hospital_App.exe for Windows 11...
"%CSC_EXE%" /nologo /target:winexe /out:"%~dp0SSNIMCH_Hospital_App.exe" /r:System.dll /r:System.Windows.Forms.dll "%~dp0launcher\AppPathConfig.cs" "%~dp0launcher\HospitalAppLauncher.cs"

IF NOT EXIST "%~dp0SSNIMCH_Hospital_App.exe" (
  echo [ERROR] Failed to compile SSNIMCH_Hospital_App.exe
  pause
  exit /b 1
)

echo [SUCCESS] Created: "%~dp0SSNIMCH_Hospital_App.exe"

REM 5. Copy SSNIMCH_Hospital_App.exe to Windows 11 Desktop (handles both OneDrive Desktop and standard Desktop)
echo [3/4] Copying SSNIMCH_Hospital_App.exe to your Windows 11 Desktop...
IF EXIST "%USERPROFILE%\Desktop" (
  copy /Y "%~dp0SSNIMCH_Hospital_App.exe" "%USERPROFILE%\Desktop\SSNIMCH_Hospital_App.exe" >nul 2>&1
)
IF EXIST "%USERPROFILE%\OneDrive\Desktop" (
  copy /Y "%~dp0SSNIMCH_Hospital_App.exe" "%USERPROFILE%\OneDrive\Desktop\SSNIMCH_Hospital_App.exe" >nul 2>&1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = [Environment]::GetFolderPath('Desktop'); Copy-Item -Path '%~dp0SSNIMCH_Hospital_App.exe' -Destination (Join-Path $d 'SSNIMCH_Hospital_App.exe') -Force" >nul 2>&1

REM 6. Ensure .env exists
IF NOT EXIST "%~dp0.env" (
  (
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=hospital_residential
    echo DB_USER=postgres
    echo DB_PASSWORD=1234
    echo PORT=3000
  ) > "%~dp0.env"
)

echo [4/4] Launching SSNIMCH_Hospital_App.exe...
start "" "%~dp0SSNIMCH_Hospital_App.exe"

echo.
echo ============================================================================
echo   DONE! "SSNIMCH_Hospital_App.exe" has been created in this folder
echo   AND copied directly to your Windows 11 Desktop!
echo   You can now double-click "SSNIMCH_Hospital_App.exe" on your Desktop anytime.
echo ============================================================================
echo.
pause
