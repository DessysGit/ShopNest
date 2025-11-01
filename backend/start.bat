@echo off
REM Start ShopNest Backend Server
echo Starting ShopNest Backend...
echo.

REM Activate virtual environment
call venv\Scripts\activate

REM Check if activation worked
if not defined VIRTUAL_ENV (
    echo ERROR: Failed to activate virtual environment
    echo Please ensure venv exists: python -m venv venv
    pause
    exit /b 1
)

echo Virtual environment activated!
echo.

REM Start the server
echo Starting Uvicorn server on http://localhost:8000
echo Press CTRL+C to stop the server
echo.
uvicorn app.main:app --reload --port 8000

pause
