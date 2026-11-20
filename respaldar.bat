@echo off
chcp 65001 >nul
setlocal

set "ORIGEN=%~dp0backend\data\datos_acopio.json"
if not exist "%ORIGEN%" (
    echo Data file not found: "%ORIGEN%"
    pause
    exit /b 1
)

for /f "usebackq delims=" %%i in (`powershell.exe -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmm'"`) do set "FECHA=%%i"
if not defined FECHA (
    echo Could not get the date for the backup file name.
    pause
    exit /b 1
)

set "CARPETA=%USERPROFILE%\Documents\MangoNota-respaldos"
if not exist "%CARPETA%" mkdir "%CARPETA%"
if errorlevel 1 (
    echo Could not create the backup folder.
    pause
    exit /b 1
)

set "DESTINO=%CARPETA%\datos_acopio_%FECHA%.json"
copy /Y "%ORIGEN%" "%DESTINO%" >nul
if errorlevel 1 (
    echo Could not copy the data file.
    pause
    exit /b 1
)

echo Backup saved to:
echo %DESTINO%
pause
