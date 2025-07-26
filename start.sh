#!/bin/bash

# Mistral Playground & Model Explorer - Startup Script

echo "🚀 Starting Mistral Playground & Model Explorer..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install --upgrade pip
echo "Choose your setup:"
echo "1. GPU setup (with vLLM) - requires CUDA"
echo "2. CPU setup (basic) - no GPU required"
echo "3. Minimal setup (for testing) - basic functionality only"
read -p "Enter choice (1, 2, or 3): " choice

if [ "$choice" = "1" ]; then
    echo "Installing GPU dependencies..."
    pip install -r requirements.txt
elif [ "$choice" = "2" ]; then
    echo "Installing CPU-only dependencies..."
    pip install -r requirements-basic.txt
else
    echo "Installing minimal dependencies..."
    pip install -r requirements-minimal.txt
fi
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before starting the application."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "1. Edit .env file with your configuration"
echo "2. Run: ./start-dev.sh"
echo ""
echo "Or use Docker:"
echo "docker-compose up --build" 