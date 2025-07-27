#!/bin/bash

# Codespaces Setup Script - Shows real-time progress

set -e

echo "🚀 Mistral Playground Codespaces Setup"
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

# Install backend dependencies
echo ""
echo "🔧 Installing backend dependencies..."
cd backend
echo "   - Upgrading pip..."
pip install --upgrade pip
echo "   - Installing CPU dependencies (recommended for Codespaces)..."
pip install -r requirements-basic.txt
echo "   ✅ Backend dependencies installed"
cd ..

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
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

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
# Run from project root with backend module path
echo "   - Backend logs will appear below:"
echo "   ==================================="
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
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
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Model Manager now shows all 25+ available models!"
echo "🔍 Check the Models tab to see the full selection."
echo ""
echo "📝 Real-time logs are displayed in this terminal!"
echo "🛑 To stop services: Ctrl+C or close this terminal"
echo ""
echo "🚀 Ready to explore!" 