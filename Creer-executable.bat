@echo off
REM ---------------------------------------------------------------------------
REM  Olmix - Saisie de fin de cycle
REM  Fabrique l'installeur Windows (.exe) dans le sous-dossier "release".
REM  A lancer depuis Windows uniquement.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"
title Olmix - Creation de l'executable

echo.
echo   ===================================================
echo     Creation de l'installeur Windows
echo   ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   [X] Node.js n'est pas installe. Voir https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo   [i] Installation des dependances...
    call npm install
    if errorlevel 1 ( echo   [X] Installation echouee. & pause & exit /b 1 )
    echo.
)

echo   [i] Compilation et empaquetage. Comptez 2 a 5 minutes.
echo.
call npm run dist
if errorlevel 1 (
    echo.
    echo   [X] La creation a echoue. Lisez le message ci-dessus.
    echo.
    pause
    exit /b 1
)

echo.
echo   [OK] Termine. Les fichiers sont dans le dossier "release" :
echo.
dir /b release\*.exe 2>nul
echo.
echo   - Olmix-Saisie-Production-...-x64.exe          installeur
echo   - Olmix-Saisie-Production-...-x64-portable.exe version sans installation
echo.
start "" explorer "%CD%\release"
pause
