#!/bin/bash

echo "🔧 FIXING CODESPACES DEPENDENCIES"
echo "================================"

echo "1. Checking current state..."
echo "   - Current directory: $(pwd)"
echo "   - Python version: $(python --version)"
echo "   - Virtual environment: $VIRTUAL_ENV"

echo ""
echo "2. Removing existing virtual environment..."
rm -rf venv

echo ""
echo "3. Creating fresh virtual environment..."
python -m venv venv
source venv/bin/activate

echo ""
echo "4. Upgrading pip..."
pip install --upgrade pip

echo ""
echo "5. Installing minimal requirements (no ChromaDB)..."
pip install -r backend/requirements-minimal-codespaces.txt

echo ""
echo "6. Testing imports..."
python -c "
try:
    from backend.app.models.requests import PromptRequest
    print('     ✅ backend.app.models.requests import successful')
except ImportError as e:
    print(f'     ❌ Import failed: {e}')

try:
    from backend.main import app
    print('     ✅ backend.main import successful')
except ImportError as e:
    print(f'     ❌ Import failed: {e}')
"

echo ""
echo "7. Testing backend startup..."
python -c "
import sys
import os
sys.path.insert(0, os.getcwd())

try:
    from backend.main import app
    print('     ✅ Backend app imported successfully!')
    print('     ✅ Ready to start uvicorn server')
except Exception as e:
    print(f'     ❌ Backend import failed: {e}')
"

echo ""
echo "=================================="
echo "🔧 FIX COMPLETE"
echo "=================================="
echo ""
echo "If imports are successful, you can now start the backend with:"
echo "  source venv/bin/activate"
echo "  PYTHONPATH=\$PWD python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000" 