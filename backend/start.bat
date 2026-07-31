@echo off
echo.
echo ========================================
echo   Kido Dev -- Agentic AI Backend
echo   AMD GPU Inference Engine
echo ========================================
echo.
echo [1] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+
    pause
    exit /b 1
)
echo.
echo [2] Installing dependencies...
pip install -r requirements.txt
echo.
echo [3] Setting up .env...
if not exist .env (
    echo Copying .env.example to .env...
    copy .env.example .env
    echo.
    echo IMPORTANT: Open backend\.env and add your Supabase credentials
    echo Then run this script again.
    pause
    exit /b 0
)
echo.
echo [4] Starting FastAPI server on http://localhost:8000
echo     Docs: http://localhost:8000/docs
echo     Press Ctrl+C to stop
echo.
python main.py
pause
