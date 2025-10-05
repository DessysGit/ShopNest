@echo off
echo Starting ShopNest Backend Server...
call venv\Scripts\activate.bat
uvicorn app.main:app --reload --port 8000
