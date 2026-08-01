@echo off
echo Starting KNOTTY SYSTEM dev environment...

:: Start PostgreSQL if not already running
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" status -D "C:\Users\user\Desktop\SYSTEM\MEGA\valano-shop\pg_data_v17_backup" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting PostgreSQL...
    "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" start -D "C:\Users\user\Desktop\SYSTEM\MEGA\valano-shop\pg_data_v17_backup" -l "C:\Users\user\pg.log" -w
) else (
    echo PostgreSQL already running.
)

:: Start backend
echo Starting backend...
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Start frontend
echo Starting frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo App running at http://localhost:3000
