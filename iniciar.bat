@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    set "PATH=%PATH%;C:\Program Files\nodejs"
    where node >nul 2>nul
    if errorlevel 1 goto :node_no_encontrado
)

netstat -ano -p tcp | findstr /R /C:":3000 .*LISTENING" >nul
if not errorlevel 1 goto :puerto_ocupado

cd /d "%~dp0backend"
if not exist "node_modules" (
    echo Instalando las dependencias de MangoNota...
    call npm.cmd install
    if errorlevel 1 goto :error
)

echo Preparando MangoNota...
call npm.cmd run build
if errorlevel 1 goto :error

start "" /b powershell.exe -NoProfile -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:3000'"
echo MangoNota está funcionando. Para apagarlo, cierra esta ventana.
call npm.cmd run start
if errorlevel 1 goto :error
exit /b 0

:node_no_encontrado
echo Instala Node.js LTS desde nodejs.org
pause
exit /b 1

:puerto_ocupado
echo MangoNota ya está abierto o el puerto 3000 está ocupado
pause
exit /b 1

:error
echo No se pudo iniciar MangoNota. Revisa el error que aparece arriba.
pause
exit /b 1
