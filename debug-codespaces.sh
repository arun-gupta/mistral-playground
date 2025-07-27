#!/bin/bash

echo "🔍 Debugging Codespaces Environment"
echo "=================================="

echo "1. Current directory:"
pwd

echo ""
echo "2. Git status:"
git status --porcelain

echo ""
echo "3. Checking if backend/__init__.py exists:"
if [ -f "backend/__init__.py" ]; then
    echo "✅ backend/__init__.py exists"
    echo "   Content:"
    cat backend/__init__.py
else
    echo "❌ backend/__init__.py missing"
fi

echo ""
echo "4. Python path:"
python -c "import sys; print('\\n'.join(sys.path))"

echo ""
echo "5. Testing imports:"
python -c "
import sys
import os

print('Current directory:', os.getcwd())
print('Python path:', sys.path)

try:
    import backend
    print('✅ backend import successful')
except ImportError as e:
    print(f'❌ backend import failed: {e}')

try:
    from backend.app.models.requests import PromptRequest
    print('✅ models import successful')
except ImportError as e:
    print(f'❌ models import failed: {e}')

try:
    from backend.main import app
    print('✅ backend.main import successful')
except ImportError as e:
    print(f'❌ backend.main import failed: {e}')
"

echo ""
echo "6. Directory structure:"
echo "   backend/:"
ls -la backend/ 2>/dev/null || echo "   ⚠️  backend directory not found"
echo "   backend/app/:"
ls -la backend/app/ 2>/dev/null || echo "   ⚠️  backend/app directory not found"
echo "   backend/app/models/:"
ls -la backend/app/models/ 2>/dev/null || echo "   ⚠️  backend/app/models directory not found" 