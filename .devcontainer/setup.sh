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
echo "   - Installing minimal requirements..."
pip install -r requirements-minimal.txt
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
    if [ ! -d "node_modules" ]; then
        echo "   - Installing frontend dependencies..."
        npm install
        echo "   ✅ Frontend dependencies installed"
    else
        echo "   ✅ Frontend dependencies exist"
    fi
    cd ..
else
    echo "   ⚠️  Node.js/npm not available"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start the backend: cd backend && source ../venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo "   2. Start the frontend: cd frontend && npm run dev"
echo "   3. Access the application:"
echo "      - Frontend: http://localhost:5173"
echo "      - Backend API: http://localhost:8000"
echo "      - API Docs: http://localhost:8000/docs"
echo ""
echo "�� Ready to develop!" 