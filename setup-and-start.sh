#!/bin/bash

# Mistral Playground & Model Explorer - Development Startup Script

set -e  # Exit on any error

echo "🚀 Starting Mistral Playground & Model Explorer in development mode..."
echo "📋 System Information:"
echo "   - Python: $(python3 --version 2>/dev/null || echo 'Not found')"
echo "   - Node.js: $(node --version 2>/dev/null || echo 'Not found')"
echo "   - npm: $(npm --version 2>/dev/null || echo 'Not found')"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate
echo "✅ Virtual environment activated"

# Install backend dependencies
echo ""
echo "🔧 Installing backend dependencies..."
cd backend
echo "   - Upgrading pip..."
pip install --upgrade pip

# Choose dependency level
echo "   - Choose dependency level:"
echo "     1. Minimal (recommended for testing) - basic functionality"
echo "     2. CPU (recommended for development) - CPU-optimized models"
echo "     3. GPU (for production) - requires CUDA"
read -p "     Enter choice (1, 2, or 3) [default: 2]: " choice
choice=${choice:-2}

if [ "$choice" = "3" ]; then
    echo "   - Installing GPU dependencies..."
    pip install -r requirements.txt
elif [ "$choice" = "2" ]; then
    echo "   - Installing CPU dependencies..."
    pip install -r requirements-basic.txt
else
    echo "   - Installing minimal dependencies..."
    pip install -r requirements-minimal.txt
fi
echo "   ✅ Backend dependencies installed"
cd ..

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating basic .env file..."
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
    echo "✅ Created basic .env file"
    echo "⚠️  You may want to customize it later"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Environment setup complete!"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting backend server..."
echo "   - Starting uvicorn server on port 8000..."
# Run from project root with backend module path
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
echo "   - Waiting for backend to initialize..."
sleep 3

# Check if backend is running
if curl -s http://localhost:8000/api/v1/models/test > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "⚠️  Backend server may not be fully started yet"
fi

# Check if Node.js is available for frontend
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo ""
    echo "🎨 Setting up frontend..."
    echo "   - Node.js: $(node --version)"
    echo "   - npm: $(npm --version)"
    
    # Check if frontend dependencies are installed
    if [ ! -d "frontend/node_modules" ]; then
        echo "   - Installing frontend dependencies..."
        cd frontend
        npm install
        echo "✅ Frontend dependencies installed"
        cd ..
    else
        echo "✅ Frontend dependencies already installed"
    fi
    
    # Start frontend
    echo "   - Starting frontend development server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo "🎉 All services started successfully!"
    echo ""
    echo "📱 Frontend: http://localhost:5173"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
    echo ""
    echo "Press Ctrl+C to stop all services"
else
    echo ""
    echo "⚠️  Node.js/npm not found. Frontend requires Node.js to run."
    echo ""
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
    echo ""
    echo "📦 To install Node.js:"
    echo ""
    echo "Option 1 - Automatic installation (if Homebrew is available):"
    echo "  ./install-nodejs.sh"
    echo ""
    echo "Option 2 - Manual installation:"
    echo "  brew install node"
    echo ""
    echo "Option 3 - Download from official website:"
    echo "  Visit https://nodejs.org/ and download the LTS version"
    echo ""
    echo "Option 4 - Using nvm (Node Version Manager):"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install --lts"
    echo "  nvm use --lts"
    echo ""
    echo "After installing Node.js, run: ./start-dev.sh"
    echo ""
    echo "Press Ctrl+C to stop backend service"
fi

echo ""
echo "🔄 Services are running. Check the URLs above to access the application."
echo ""

# Wait for background processes
wait 