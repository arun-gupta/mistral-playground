#!/bin/bash

# Exit on any error
set -e

echo "🚀 Setting up Mistral Playground in Codespaces..."

# Update package lists
sudo apt-get update

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    build-essential \
    curl \
    git \
    wget \
    unzip \
    libgl1-mesa-glx \
    libglib2.0-0

# Get the workspace directory
WORKSPACE_DIR=$(pwd)
echo "📁 Workspace directory: $WORKSPACE_DIR"

# Create Python virtual environment
echo "🐍 Setting up Python environment..."
python3 -m venv $WORKSPACE_DIR/venv
source $WORKSPACE_DIR/venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies (use minimal for faster setup)
echo "📚 Installing Python dependencies..."
cd $WORKSPACE_DIR/backend
if [ -f "requirements-minimal.txt" ]; then
    pip install -r requirements-minimal.txt
else
    pip install -r requirements-basic.txt
fi

# Install frontend dependencies
echo "🎨 Installing frontend dependencies..."
cd $WORKSPACE_DIR/frontend
npm install

# Generate secret key if .env doesn't exist
echo "🔑 Setting up environment..."
cd $WORKSPACE_DIR
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    
    # Generate a secure secret key
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/your-secret-key-here/$SECRET_KEY/" .env
    
    # Set Codespaces-specific settings
    sed -i "s/MOCK_MODE=false/MOCK_MODE=true/" .env
    sed -i "s/API_HOST=0.0.0.0/API_HOST=0.0.0.0/" .env
    sed -i "s/CORS_ORIGINS=\[\"http:\/\/localhost:5173\", \"http:\/\/localhost:3000\"\]/CORS_ORIGINS=[\"https:\/\/*.github.dev\", \"http:\/\/localhost:5173\", \"http:\/\/localhost:3000\"]/" .env
    
    echo "✅ Environment file created with Codespaces settings"
fi

# Create necessary directories
mkdir -p $WORKSPACE_DIR/chroma_db
mkdir -p $WORKSPACE_DIR/logs

# Set permissions
chmod +x $WORKSPACE_DIR/start-dev.sh
chmod +x $WORKSPACE_DIR/start.sh

echo "✅ Setup complete! Mistral Playground is ready for Codespaces."
echo ""
echo "📋 Next steps:"
echo "1. The application will start automatically"
echo "2. Backend API will be available at: http://localhost:8000"
echo "3. Frontend will be available at: http://localhost:5173"
echo "4. API docs will be available at: http://localhost:8000/docs"
echo ""
echo "🎯 Note: Mock mode is enabled by default in Codespaces for faster startup."
echo "   To use real models, edit .env and set MOCK_MODE=false" 