#!/bin/bash

echo "🚀 Setting up Mistral Playground in Codespaces..."

# Kill any existing processes on ports 8000 and 5173
echo "🔧 Checking for existing processes..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Killing existing backend processes on port 8000..."
    lsof -ti :8000 | xargs kill -9
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  Killing existing frontend processes on port 5173..."
    lsof -ti :5173 | xargs kill -9
fi

# Wait for processes to fully terminate
sleep 2

# Codespaces Setup Script - Shows real-time progress

set -e

echo "🚀 Mistral Playground Codespaces Setup (AUTOMATED - NO PROMPTS)"
echo "======================================"
echo ""

# Show system info
echo "📋 System Information:"
echo "   - Python: $(python3 --version 2>/dev/null || echo 'Not found')"
echo "   - Node.js: $(node --version 2>/dev/null || echo 'Not found')"
echo "   - npm: $(npm --version 2>/dev/null || echo 'Not found')"
echo ""

# Setup Python environment
echo "🐍 Setting up Python environment..."
if [ ! -d "venv" ]; then
    echo "   - Creating virtual environment..."
    python3 -m venv venv
    echo "   ✅ Virtual environment created"
else
    echo "   ✅ Virtual environment exists"
fi

echo "   - Activating virtual environment..."
source venv/bin/activate
echo "   ✅ Virtual environment activated"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
echo "   - Installing basic requirements for Codespaces..."

# Try the minimal requirements first to avoid SQLite issues
if pip install -r backend/requirements-minimal-codespaces.txt; then
    echo "   ✅ Minimal requirements installed successfully"
else
    echo "   ⚠️  Minimal requirements failed, trying basic requirements..."
    if pip install -r backend/requirements-basic.txt; then
        echo "   ✅ Basic requirements installed successfully"
    else
        echo "   ❌ Basic requirements failed, trying minimal requirements with --no-deps..."
        pip install --no-deps -r backend/requirements-minimal-codespaces.txt || echo "   ⚠️  Installation had issues but continuing..."
    fi
fi

# Create .env file
echo ""
echo "📝 Setting up configuration..."
if [ ! -f ".env" ]; then
    echo "   - Creating .env file..."
    cat > .env << EOF
# Model Configuration
MODEL_PROVIDER=huggingface
MODEL_NAME=microsoft/DialoGPT-small
DEVICE=cpu

# Vector Database
CHROMA_PERSIST_DIRECTORY=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000", "https://*.app.github.dev"]

# Optional: Hugging Face API
HUGGINGFACE_API_KEY=your-huggingface-api-key-here

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=INFO

# Development/Testing
MOCK_MODE=False
EOF
    echo "   ✅ .env file created"
else
    echo "   ✅ .env file exists"
    # Check if HUGGINGFACE_API_KEY is missing and add it if needed
    if ! grep -q "^HUGGINGFACE_API_KEY=" .env; then
        echo "   - Adding missing HUGGINGFACE_API_KEY to existing .env file..."
        echo "" >> .env
        echo "# Optional: Hugging Face API" >> .env
        echo "HUGGINGFACE_API_KEY=your-huggingface-api-key-here" >> .env
        echo "   ✅ Added HUGGINGFACE_API_KEY to .env file"
    fi
fi

# Setup frontend
echo ""
echo "🎨 Setting up frontend..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo "   - Node.js: $(node --version)"
    echo "   - npm: $(npm --version)"
    
    cd frontend
    echo "   - Installing frontend dependencies..."
    chmod +x install-deps.sh
    ./install-deps.sh
    cd ..
else
    echo "   ⚠️  Node.js/npm not available"
fi

# Start backend server
echo ""
echo "🚀 Starting backend server..."
echo "   - Starting uvicorn server on port 8000..."
source venv/bin/activate

echo ""
echo "🔍 COMPREHENSIVE DEBUG INFORMATION"
echo "=================================="

echo "1. Environment Information:"
echo "   - Current directory: $(pwd)"
echo "   - Python version: $(python --version)"
echo "   - PYTHONPATH: $PYTHONPATH"
echo "   - Virtual environment: $VIRTUAL_ENV"

echo ""
echo "2. Git Status:"
git status --porcelain || echo "   ⚠️  Git status check failed"

echo ""
echo "3. File Structure Check:"
echo "   - backend/ exists: $([ -d "backend" ] && echo "✅" || echo "❌")"
echo "   - backend/__init__.py exists: $([ -f "backend/__init__.py" ] && echo "✅" || echo "❌")"
echo "   - backend/app/ exists: $([ -d "backend/app" ] && echo "✅" || echo "❌")"
echo "   - backend/app/__init__.py exists: $([ -f "backend/app/__init__.py" ] && echo "✅" || echo "❌")"
echo "   - backend/app/models/ exists: $([ -d "backend/app/models" ] && echo "✅" || echo "❌")"
echo "   - backend/app/models/__init__.py exists: $([ -f "backend/app/models/__init__.py" ] && echo "✅" || echo "❌")"
echo "   - backend/app/models/requests.py exists: $([ -f "backend/app/models/requests.py" ] && echo "✅" || echo "❌")"

echo ""
echo "4. File Contents Check:"
if [ -f "backend/__init__.py" ]; then
    echo "   - backend/__init__.py content:"
    cat backend/__init__.py | sed 's/^/     /'
else
    echo "   - Creating missing backend/__init__.py..."
    echo "# Backend package initialization" > backend/__init__.py
    echo "   - Created backend/__init__.py"
fi

echo ""
echo "5. Python Path Analysis:"
python -c "
import sys
import os

print('   - Current working directory:', os.getcwd())
print('   - Python executable:', sys.executable)
print('   - Python path entries:')
for i, path in enumerate(sys.path):
    print(f'     {i}: {path}')
print('   - Is current directory in Python path:', os.getcwd() in sys.path)
"

echo ""
echo "6. Import Testing (Step by Step):"
python -c "
import sys
import os

print('   - Testing basic imports...')

# Test 1: Can we import sys and os?
try:
    import sys
    import os
    print('     ✅ sys and os imports successful')
except ImportError as e:
    print(f'     ❌ sys/os import failed: {e}')

# Test 2: Can we add current directory to path?
try:
    current_dir = os.getcwd()
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
        print(f'     ✅ Added {current_dir} to Python path')
    else:
        print(f'     ✅ {current_dir} already in Python path')
except Exception as e:
    print(f'     ❌ Failed to modify Python path: {e}')

# Test 3: Can we list files in current directory?
try:
    files = os.listdir('.')
    backend_files = [f for f in files if f.startswith('backend')]
    print(f'     ✅ Current directory files: {files[:5]}...')
    print(f'     ✅ Backend-related files: {backend_files}')
except Exception as e:
    print(f'     ❌ Failed to list files: {e}')

# Test 4: Can we import backend?
try:
    import backend
    print('     ✅ backend module import successful')
    print(f'     ✅ backend module location: {backend.__file__}')
except ImportError as e:
    print(f'     ❌ backend import failed: {e}')
    print(f'     ❌ Error type: {type(e).__name__}')

# Test 5: Can we import backend.app?
try:
    import backend.app
    print('     ✅ backend.app module import successful')
    print(f'     ✅ backend.app module location: {backend.app.__file__}')
except ImportError as e:
    print(f'     ❌ backend.app import failed: {e}')

# Test 6: Can we import backend.app.models?
try:
    import backend.app.models
    print('     ✅ backend.app.models module import successful')
    print(f'     ✅ backend.app.models module location: {backend.app.models.__file__}')
except ImportError as e:
    print(f'     ❌ backend.app.models import failed: {e}')

# Test 7: Can we import from backend.app.models.requests?
try:
    from backend.app.models.requests import PromptRequest
    print('     ✅ backend.app.models.requests import successful')
except ImportError as e:
    print(f'     ❌ backend.app.models.requests import failed: {e}')

# Test 8: Can we import the main app?
try:
    from backend.main import app
    print('     ✅ backend.main import successful')
except ImportError as e:
    print(f'     ❌ backend.main import failed: {e}')
    print(f'     ❌ Full error details: {e}')
"

echo ""
echo "7. Directory Listing:"
echo "   - Current directory contents:"
ls -la | head -10 | sed 's/^/     /'
echo "   - Backend directory contents:"
ls -la backend/ 2>/dev/null | sed 's/^/     /' || echo "     ⚠️  backend directory not found"
echo "   - Backend/app directory contents:"
ls -la backend/app/ 2>/dev/null | sed 's/^/     /' || echo "     ⚠️  backend/app directory not found"

echo ""
echo "8. Module Search Test:"
python -c "
import importlib.util
import os

print('   - Testing module search...')

# Test if we can find the backend module
try:
    spec = importlib.util.find_spec('backend')
    if spec:
        print(f'     ✅ Found backend module at: {spec.origin}')
    else:
        print('     ❌ backend module not found by importlib')
except Exception as e:
    print(f'     ❌ Error finding backend module: {e}')

# Test if we can find the backend.app.models module
try:
    spec = importlib.util.find_spec('backend.app.models')
    if spec:
        print(f'     ✅ Found backend.app.models module at: {spec.origin}')
    else:
        print('     ❌ backend.app.models module not found by importlib')
except Exception as e:
    print(f'     ❌ Error finding backend.app.models module: {e}')
"

echo ""
echo "=================================="
echo "🔍 DEBUG INFORMATION COMPLETE"
echo "=================================="

# Set PYTHONPATH explicitly for Codespaces
export PYTHONPATH=$PWD
echo "   - PYTHONPATH set to: $PYTHONPATH"

# Load HUGGINGFACE_API_KEY from .env file if it exists
if [ -f ".env" ]; then
    export HUGGINGFACE_API_KEY=$(grep "^HUGGINGFACE_API_KEY=" .env | cut -d'=' -f2)
    echo "   - Loaded HUGGINGFACE_API_KEY from .env file"
    echo "   - HUGGINGFACE_API_KEY: ${HUGGINGFACE_API_KEY:0:10}..."
else
    echo "   - ⚠️  No .env file found, HUGGINGFACE_API_KEY not set"
fi

# Run from project root with backend module path and set PYTHONPATH
echo "   - Backend logs will appear below:"
echo "   ==================================="
PYTHONPATH=$PWD python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid

# Wait for backend to start
echo "   - Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Backend server is running"
else
    echo "   ⚠️  Backend server may not be fully started yet"
fi

# Start frontend server
echo ""
echo "🎨 Starting frontend server..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    cd frontend
    echo "   - Starting frontend development server..."
    echo "   - Frontend logs will appear below:"
    echo "   ==================================="
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    
    echo "   ✅ Frontend server started"
else
    echo "   ⚠️  Frontend requires Node.js to run"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 Services are running!"
echo "📱 Frontend: Check Codespaces port forwarding for port 5173"
echo "🔧 Backend API: Check Codespaces port forwarding for port 8000"
echo "📚 API Docs: Check Codespaces port forwarding for port 8000/docs"
echo ""
echo "💡 In Codespaces, use the forwarded port URLs from the 'PORTS' tab"
echo "   Example: https://your-codespace-name-5173.app.github.dev"
echo ""
echo "📋 Model Manager now shows all 25+ available models!"
echo "🔍 Check the Models tab to see the full selection."
echo ""
echo "📝 Real-time logs are displayed in this terminal!"
echo "🛑 To stop services: Ctrl+C or close this terminal"
echo ""
echo "📋 LOGS INFORMATION:"
echo "   📄 Quick status: ./show-logs.sh"
echo "   📄 Access URLs: ./show-codespaces-urls.sh"
echo "   📄 Setup logs: cat /tmp/setup.log"
echo "   📄 Follow logs: tail -f /tmp/setup.log"
echo "   📄 Service status: lsof -i :8000,5173"
echo ""
echo "🚀 Ready to explore!" 