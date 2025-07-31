@echo off
setlocal enabledelayedexpansion

REM Mistral Playground & Model Explorer - Development Startup Script for Windows

echo 🚀 Starting Mistral Playground ^& Model Explorer in development mode...
echo 📋 System Information:
python --version 2>nul && echo    - Python: Found || echo    - Python: Not found
node --version 2>nul && echo    - Node.js: Found || echo    - Node.js: Not found
npm --version 2>nul && echo    - npm: Found || echo    - npm: Not found
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.11+ first.
    echo Visit https://www.python.org/downloads/ to download Python
    pause
    exit /b 1
)

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat
echo ✅ Virtual environment activated

REM Install backend dependencies
echo.
echo 🔧 Installing backend dependencies...
cd backend
echo    - Upgrading pip...
python -m pip install --upgrade pip

REM Install CPU dependencies automatically (recommended for development)
echo    - Installing CPU dependencies (recommended for development)...
pip install -r requirements-basic.txt
echo    ✅ Backend dependencies installed
cd ..

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating basic .env file...
    (
        echo # Model Configuration
        echo MODEL_PROVIDER=huggingface
        echo MODEL_NAME=microsoft/DialoGPT-small
        echo DEVICE=cpu
        echo.
        echo # Vector Database
        echo CHROMA_PERSIST_DIRECTORY=./chroma_db
        echo EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
        echo.
        echo # API Configuration
        echo API_HOST=0.0.0.0
        echo API_PORT=8000
        echo CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
        echo.
        echo # Optional: Hugging Face API
        echo HUGGINGFACE_API_KEY=your-huggingface-api-key-here
        echo.
        echo # Security
        echo SECRET_KEY=your-secret-key-here
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo.
        echo # Logging
        echo LOG_LEVEL=INFO
        echo.
        echo # Development/Testing
        echo MOCK_MODE=False
    ) > .env
    echo ✅ Created basic .env file
    echo ⚠️  You may want to customize it later
) else (
    echo ✅ .env file already exists
    REM Check if HUGGINGFACE_API_KEY is missing and add it if needed
    findstr /c:"^HUGGINGFACE_API_KEY=" .env >nul
    if errorlevel 1 (
        echo 📝 Adding missing HUGGINGFACE_API_KEY to existing .env file...
        echo. >> .env
        echo # Optional: Hugging Face API >> .env
        echo HUGGINGFACE_API_KEY=your-huggingface-api-key-here >> .env
        echo ✅ Added HUGGINGFACE_API_KEY to .env file
    )
)

echo.
echo ✅ Environment setup complete!
echo.

REM Function to cleanup background processes
:cleanup
echo.
echo 🛑 Shutting down services...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
exit /b 0

REM Start backend
echo 🔧 Starting backend server...
echo    - Starting uvicorn server on port 8000...

REM Load HUGGINGFACE_API_KEY from .env file if it exists
if exist ".env" (
    for /f "tokens=2 delims==" %%a in ('findstr "^HUGGINGFACE_API_KEY=" .env') do set HUGGINGFACE_API_KEY=%%a
    echo    - Loaded HUGGINGFACE_API_KEY from .env file
)

REM Set PYTHONPATH and start backend
set PYTHONPATH=%CD%
start /b python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

REM Wait a moment for backend to start
echo    - Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

REM Check if backend is running
curl -s http://localhost:8000/api/v1/models/test >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Backend server may not be fully started yet
) else (
    echo ✅ Backend server is running
)

REM Check if Node.js is available for frontend
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Node.js not found. Frontend requires Node.js to run.
    echo.
    echo 🔧 Backend API: http://localhost:8000
    echo 📚 API Docs: http://localhost:8000/docs
    echo.
    echo 📦 To install Node.js:
    echo.
    echo Option 1 - Download from official website:
    echo   Visit https://nodejs.org/ and download the LTS version
    echo.
    echo Option 2 - Using Chocolatey (if installed):
    echo   choco install nodejs
    echo.
    echo Option 3 - Using winget:
    echo   winget install OpenJS.NodeJS
    echo.
    echo After installing Node.js, run: setup-and-start.bat
    echo.
    echo Press Ctrl+C to stop backend service
    goto :wait_backend
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  npm not found. Please install Node.js which includes npm.
    goto :wait_backend
)

echo.
echo 🎨 Setting up frontend...
echo    - Node.js: 
node --version
echo    - npm: 
npm --version

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo    - Installing frontend dependencies...
    cd frontend
    npm install
    echo ✅ Frontend dependencies installed
    cd ..
) else (
    echo ✅ Frontend dependencies already installed
)

REM Start frontend
echo    - Starting frontend development server...
cd frontend
start /b npm run dev
cd ..

echo.
echo 🎉 All services started successfully!
echo.

echo 🏠 Running locally
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop all services

:wait_backend
echo.
echo 🔄 Services are running. Check the URLs above to access the application.
echo.

REM Wait for user input to stop
pause >nul
goto :cleanup 