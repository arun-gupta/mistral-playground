#!/bin/bash

echo "🔧 SETTING UP RAG FUNCTIONALITY"
echo "==============================="

echo "1. Checking environment..."
echo "   - Current directory: $(pwd)"
echo "   - Python version: $(python --version)"
echo "   - SQLite version: $(python -c 'import sqlite3; print(sqlite3.sqlite_version)')"

# Check if we're in Codespaces
if [ -n "$CODESPACES" ]; then
    echo "   - Environment: GitHub Codespaces"
    REQUIREMENTS_FILE="backend/requirements-minimal-codespaces.txt"
    echo "   ⚠️  Using minimal requirements (no ChromaDB) for Codespaces compatibility"
else
    echo "   - Environment: Local development"
    REQUIREMENTS_FILE="backend/requirements-local.txt"
    echo "   ✅ Using local requirements with ChromaDB support"
fi

echo ""
echo "2. Installing dependencies..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "   - Activating virtual environment..."
    source venv/bin/activate
else
    echo "   - Creating virtual environment..."
    python -m venv venv
    source venv/bin/activate
fi

# Install dependencies
echo "   - Installing from $REQUIREMENTS_FILE..."
pip install -r $REQUIREMENTS_FILE

echo ""
echo "3. Testing ChromaDB compatibility..."

# Test ChromaDB import
if python -c "import chromadb; print('✅ ChromaDB available')" 2>/dev/null; then
    echo "   ✅ ChromaDB is available and working"
    RAG_AVAILABLE=true
else
    echo "   ⚠️  ChromaDB not available (this is normal in Codespaces)"
    RAG_AVAILABLE=false
fi

echo ""
echo "4. Testing backend startup..."

# Test backend import
if python -c "import sys; sys.path.insert(0, '.'); from backend.main import app; print('✅ Backend imports successfully')" 2>/dev/null; then
    echo "   ✅ Backend can be imported"
else
    echo "   ❌ Backend import failed"
    exit 1
fi

echo ""
echo "5. Creating RAG directories..."

# Create RAG directories
mkdir -p chroma_db
mkdir -p uploads
echo "   ✅ Created chroma_db and uploads directories"

echo ""
echo "6. Setting up environment variables..."

# Create or update .env file
if [ ! -f ".env" ]; then
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
    echo "   ✅ Created .env file"
else
    echo "   ✅ .env file already exists"
fi

echo ""
echo "=================================="
echo "🔧 RAG SETUP COMPLETE"
echo "=================================="

if [ "$RAG_AVAILABLE" = true ]; then
    echo ""
    echo "✅ RAG functionality is available!"
    echo "📚 You can now:"
    echo "   - Upload documents in the RAG tab"
    echo "   - Query documents with AI assistance"
    echo "   - Use document-based question answering"
else
    echo ""
    echo "⚠️  RAG functionality is not available"
    echo "📚 This is normal in Codespaces due to SQLite version limitations"
    echo "💡 For full RAG functionality, use local development environment"
fi

echo ""
echo "🚀 To start the servers:"
echo "   ./start-servers-only.sh"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs" 