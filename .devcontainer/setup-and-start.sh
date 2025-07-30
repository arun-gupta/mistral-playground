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

set -e

echo "🚀 Mistral Playground Codespaces Setup"
echo "======================================"

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
if pip install -r backend/requirements-minimal-codespaces.txt; then
    echo "   ✅ Dependencies installed successfully"
else
    echo "   ⚠️  Installation had issues but continuing..."
fi

# Create .env file if it doesn't exist
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

# Hosted Model API Keys (add your keys here)
# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# GOOGLE_API_KEY=your_google_api_key_here

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=INFO

# Development/Testing
MOCK_MODE=True
EOF
    echo "   ✅ .env file created"
else
    echo "   ✅ .env file exists"
fi

# Setup frontend
echo "🎨 Setting up frontend..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo "   - Installing frontend dependencies..."
    cd frontend
    npm install --silent
    cd ..
    echo "   ✅ Frontend dependencies installed"
else
    echo "   ⚠️  Node.js/npm not available"
fi

# Set PYTHONPATH
export PYTHONPATH=$PWD
echo "   - PYTHONPATH set to: $PYTHONPATH"

# Start backend server
echo "🚀 Starting backend server..."
echo "   - Starting uvicorn server on port 8000..."
source venv/bin/activate

# Start backend in background
PYTHONPATH=$PWD python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid

# Wait for backend to start
echo "   - Waiting for backend to initialize..."
sleep 8

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Backend server is running"
else
    echo "   ⚠️  Backend server may not be fully started yet"
    echo "   📄 Check backend logs: tail -f /tmp/backend.log"
fi

# Start frontend server
echo "🎨 Starting frontend server..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    cd frontend
    echo "   - Starting frontend development server..."
    npm run dev > /tmp/frontend.log 2>&1 &
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
echo "📋 LOGS INFORMATION:"
echo "   📄 Backend logs: tail -f /tmp/backend.log"
echo "   📄 Frontend logs: tail -f /tmp/frontend.log"
echo "   📄 Quick status: ./show-logs.sh"
echo "   📄 Access URLs: ./show-codespaces-urls.sh"
echo "   📄 Service status: lsof -i :8000,5173"
echo ""
echo "🚀 Ready to explore!" 