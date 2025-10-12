@echo off
echo ========================================
echo   ShopNest Backend - Starting Server
echo ========================================
echo.

REM Check if we're in the backend directory
if not exist "app\main.py" (
    echo ERROR: Please run this script from the backend directory!
    echo Current directory: %CD%
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please create it first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo [1/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [2/3] Checking dependencies...
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo.
    echo WARNING: FastAPI not installed in virtual environment!
    echo Installing dependencies...
    pip install -r requirements.txt
)

echo [3/3] Starting server...
echo.
echo ========================================
echo   Server starting at http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Press CTRL+C to stop the server
echo ========================================
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
