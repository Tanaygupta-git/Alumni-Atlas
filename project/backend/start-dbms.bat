@echo off
set PORT=%1
if "%PORT%"=="" set PORT=8002
echo Starting Alumni Atlas DBMS...
echo Opening: http://localhost:%PORT%
echo.

cd /d "%~dp0"
call "%~dp0stop-dbms.bat" %PORT% >nul 2>&1
python dbms_interface.py %PORT%
