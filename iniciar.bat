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
echo Node.js %NODE_VERSION%

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "try { if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :puerto_ocupado

cd /d "%~dp0backend"
if not exist "node_modules" (
    echo Installing MangoNota dependencies...
    call npm.cmd install
    if errorlevel 1 goto :error
)

echo Building MangoNota...
call npm.cmd run build
if errorlevel 1 goto :error

start "" /b "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "$deadline=[DateTime]::UtcNow.AddSeconds(60); while([DateTime]::UtcNow -lt $deadline) { $remaining=($deadline-[DateTime]::UtcNow).TotalSeconds; $timeout=[Math]::Max(1,[Math]::Min(2,[Math]::Ceiling($remaining))); try { $response=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec $timeout -ErrorAction Stop; if($response.StatusCode -eq 200 -and [DateTime]::UtcNow -lt $deadline) { Start-Process 'http://localhost:3000'; exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
echo MangoNota is starting. Leave this window open to use it.
call npm.cmd run start
if errorlevel 1 goto :error
exit /b 0

:node_no_encontrado
echo Node.js was not found. Install Node.js LTS from nodejs.org.
pause
exit /b 1

:node_version_error
echo Could not read the Node.js version. Check your Node.js installation.
pause
exit /b 1

:puerto_ocupado
echo MangoNota is already open or port 3000 is in use.
pause
exit /b 1

:error
echo MangoNota could not start. Check the error shown above.
pause
exit /b 1
