@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    set "PATH=%PATH%;C:\Program Files\nodejs"
    where node >nul 2>nul
    if errorlevel 1 goto :node_no_encontrado
)

for /f "delims=" %%V in ('node -v 2^>nul') do set "NODE_VERSION=%%V"
if not defined NODE_VERSION goto :node_version_error
echo Version de Node.js: %NODE_VERSION%

set "MANGONOTA_ROOT=%~dp0"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "$listeners=Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if(-not $listeners){exit 1}; $expected=[IO.Path]::GetFullPath((Join-Path $env:MANGONOTA_ROOT 'backend\dist\main')); foreach($listener in $listeners){$process=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$listener.OwningProcess); if($process.CommandLine -and $process.CommandLine.IndexOf($expected,[StringComparison]::OrdinalIgnoreCase) -ge 0){exit 0}}; exit 2" >nul 2>nul
if errorlevel 2 goto :puerto_ocupado
if not errorlevel 1 goto :mangonota_ya_abierto

cd /d "%~dp0backend"
if not exist "node_modules" (
    echo Instalando las dependencias de MangoNota...
    call npm.cmd install
    if errorlevel 1 goto :error
)

echo Preparando MangoNota...
call npm.cmd run build
if errorlevel 1 goto :error

start "" /b "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "$deadline=[DateTime]::UtcNow.AddSeconds(60); while([DateTime]::UtcNow -lt $deadline) { $remaining=($deadline-[DateTime]::UtcNow).TotalSeconds; $timeout=[Math]::Max(1,[Math]::Min(2,[Math]::Ceiling($remaining))); try { $response=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec $timeout -ErrorAction Stop; if($response.StatusCode -eq 200 -and [DateTime]::UtcNow -lt $deadline) { Start-Process 'http://localhost:3000'; exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
echo MangoNota esta iniciando. Deja esta ventana abierta mientras lo uses. Para apagarlo, cierrala.
call npm.cmd run start
if errorlevel 1 goto :error
exit /b 0

:node_no_encontrado
echo No se encontro Node.js. Instala Node.js LTS desde nodejs.org.
pause
exit /b 1

:node_version_error
echo No se pudo leer la version de Node.js. Revisa la instalacion de Node.js.
pause
exit /b 1

:puerto_ocupado
echo MangoNota ya esta abierto o el puerto 3000 esta ocupado.
pause
exit /b 1

:mangonota_ya_abierto
echo MangoNota ya esta funcionando. Abriendo la pagina en el navegador.
start "" "http://localhost:3000"
exit /b 0

:error
echo MangoNota no pudo iniciar. Revisa el error que aparece arriba.
pause
exit /b 1
