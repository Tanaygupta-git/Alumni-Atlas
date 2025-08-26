@echo off
set PORT=%1
if "%PORT%"=="" set PORT=8002
echo Stopping DBMS on port %PORT% ...
powershell -NoProfile -Command "try { iwr -UseBasicParsing http://localhost:%PORT%/__shutdown__ | Out-Null } catch { }"
REM Wait briefly and force kill if still listening
timeout /t 1 >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
	echo Forcing kill of PID %%a on port %PORT% ...
	taskkill /F /PID %%a >nul 2>&1
)
echo Done.
