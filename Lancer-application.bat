@echo off
REM ---------------------------------------------------------------------------
REM  Olmix - Saisie de fin de cycle
REM  Lance l'application en mode developpement (double-clic depuis l'Explorateur).
REM  Les messages sont volontairement sans accent : selon la page de codes du
REM  poste, cmd.exe les afficherait sinon en caracteres illisibles.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"
title Olmix - Saisie de fin de cycle

echo.
echo   ===================================================
echo     OLMIX - Saisie de fin de cycle de production
echo   ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   [X] Node.js n'est pas installe sur ce poste.
    echo.
    echo       Telechargez la version "LTS" sur https://nodejs.org
    echo       installez-la, puis relancez ce fichier.
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node --version') do set NODEVER=%%v
echo   [i] Node.js detecte : %NODEVER%
echo.

if not exist "node_modules\" (
    echo   [i] Premiere utilisation : installation des dependances.
    echo       Comptez 1 a 3 minutes, une seule fois.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo   [X] L'installation a echoue. Verifiez la connexion Internet.
        echo.
        pause
        exit /b 1
    )
    echo.
)

echo   [i] Demarrage... la fenetre de l'application va s'ouvrir.
echo.
echo   /!\ Gardez cette fenetre noire ouverte pendant l'utilisation.
echo       La fermer arrete l'application.
echo.

call npm run dev

echo.
echo   Application arretee.
pause
