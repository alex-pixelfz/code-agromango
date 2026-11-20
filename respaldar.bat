@echo off
chcp 65001 >nul
setlocal

set "ORIGEN=%~dp0backend\data\datos_acopio.json"
if not exist "%ORIGEN%" (
    echo No se encontro el archivo de datos: "%ORIGEN%"
    pause
    exit /b 1
)

for /f "usebackq delims=" %%i in (`powershell.exe -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmm'"`) do set "FECHA=%%i"
if not defined FECHA (
    echo No se pudo obtener la fecha para el nombre de la copia.
    pause
    exit /b 1
)

set "CARPETA=%USERPROFILE%\Documents\MangoNota-respaldos"
if not exist "%CARPETA%" mkdir "%CARPETA%"
if errorlevel 1 (
    echo No se pudo crear la carpeta de copias de respaldo.
    pause
    exit /b 1
)

set "DESTINO=%CARPETA%\datos_acopio_%FECHA%.json"
copy /Y "%ORIGEN%" "%DESTINO%" >nul
if errorlevel 1 (
    echo No se pudo copiar el archivo de datos.
    pause
    exit /b 1
)

echo Copia de respaldo guardada en:
echo %DESTINO%
pause
