@echo off
echo ========================================
echo   ShopNest Backend Setup Script
echo ========================================
echo.

REM Check if venv exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created!
    echo.
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy .env.example to .env
echo 2. Update .env with your Supabase database URL
echo 3. Run migrations: alembic upgrade head
echo 4. Start server: uvicorn app.main:app --reload --port 8000
echo.
pause
