#!/bin/bash

# Mistral Playground & Prompt Tuner - Development Startup Script

echo "🚀 Starting Mistral Playground & Prompt Tuner in development mode..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies if requirements files exist
if [ -f "backend/requirements-minimal.txt" ]; then
    echo "📦 Installing minimal backend dependencies..."
    cd backend
    pip install --upgrade pip
    pip install -r requirements-minimal.txt
    cd ..
fi

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
    echo "⚠️  Created basic .env file. You may want to customize it later."
fi

echo "✅ Environment check passed"

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
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if Node.js is available for frontend
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
    echo "✅ npm found: $(npm --version)"
    
    # Check if frontend dependencies are installed
    if [ ! -d "frontend/node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
    
    # Start frontend
    echo "🎨 Starting frontend development server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo "🎉 Services started!"
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

# Wait for background processes
wait 