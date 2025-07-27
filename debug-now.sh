#!/bin/bash

echo "🔍 IMMEDIATE DEBUG DIAGNOSIS"
echo "============================"

echo "1. Environment Information:"
echo "   - Current directory: $(pwd)"
echo "   - Python version: $(python --version)"
echo "   - PYTHONPATH: $PYTHONPATH"
echo "   - Virtual environment: $VIRTUAL_ENV"

echo ""
echo "2. Git Status:"
git status --porcelain || echo "   ⚠️  Git status check failed"

echo ""
echo "3. File Structure Check:"
echo "   - backend/ exists: $([ -d "backend" ] && echo "✅" || echo "❌")"
echo "   - backend/__init__.py exists: $([ -f "backend/__init__.py" ] && echo "✅" || echo "❌")"
echo "   - backend/app/ exists: $([ -d "backend/app" ] && echo "✅" || echo "❌")"
echo "   - backend/app/__init__.py exists: $([ -f "backend/app/__init__.py" ] && echo "✅" || echo "❌")"
echo "   - backend/app/models/ exists: $([ -d "backend/app/models" ] && echo "✅" || echo "❌")"
echo "   - backend/app/models/__init__.py exists: $([ -f "backend/app/models/__init__.py" ] && echo "✅" || echo "❌")"
echo "   - backend/app/models/requests.py exists: $([ -f "backend/app/models/requests.py" ] && echo "✅" || echo "❌")"

echo ""
echo "4. File Contents Check:"
if [ -f "backend/__init__.py" ]; then
    echo "   - backend/__init__.py content:"
    cat backend/__init__.py | sed 's/^/     /'
else
    echo "   - Creating missing backend/__init__.py..."
    echo "# Backend package initialization" > backend/__init__.py
    echo "   - Created backend/__init__.py"
fi

echo ""
echo "5. Python Path Analysis:"
python -c "
import sys
import os

print('   - Current working directory:', os.getcwd())
print('   - Python executable:', sys.executable)
print('   - Python path entries:')
for i, path in enumerate(sys.path):
    print(f'     {i}: {path}')
print('   - Is current directory in Python path:', os.getcwd() in sys.path)
"

echo ""
echo "6. Import Testing (Step by Step):"
python -c "
import sys
import os

print('   - Testing basic imports...')

# Test 1: Can we import sys and os?
try:
    import sys
    import os
    print('     ✅ sys and os imports successful')
except ImportError as e:
    print(f'     ❌ sys/os import failed: {e}')

# Test 2: Can we add current directory to path?
try:
    current_dir = os.getcwd()
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
        print(f'     ✅ Added {current_dir} to Python path')
    else:
        print(f'     ✅ {current_dir} already in Python path')
except Exception as e:
    print(f'     ❌ Failed to modify Python path: {e}')

# Test 3: Can we list files in current directory?
try:
    files = os.listdir('.')
    backend_files = [f for f in files if f.startswith('backend')]
    print(f'     ✅ Current directory files: {files[:5]}...')
    print(f'     ✅ Backend-related files: {backend_files}')
except Exception as e:
    print(f'     ❌ Failed to list files: {e}')

# Test 4: Can we import backend?
try:
    import backend
    print('     ✅ backend module import successful')
    print(f'     ✅ backend module location: {backend.__file__}')
except ImportError as e:
    print(f'     ❌ backend import failed: {e}')
    print(f'     ❌ Error type: {type(e).__name__}')

# Test 5: Can we import backend.app?
try:
    import backend.app
    print('     ✅ backend.app module import successful')
    print(f'     ✅ backend.app module location: {backend.app.__file__}')
except ImportError as e:
    print(f'     ❌ backend.app import failed: {e}')

# Test 6: Can we import backend.app.models?
try:
    import backend.app.models
    print('     ✅ backend.app.models module import successful')
    print(f'     ✅ backend.app.models module location: {backend.app.models.__file__}')
except ImportError as e:
    print(f'     ❌ backend.app.models import failed: {e}')

# Test 7: Can we import from backend.app.models.requests?
try:
    from backend.app.models.requests import PromptRequest
    print('     ✅ backend.app.models.requests import successful')
except ImportError as e:
    print(f'     ❌ backend.app.models.requests import failed: {e}')

# Test 8: Can we import the main app?
try:
    from backend.main import app
    print('     ✅ backend.main import successful')
except ImportError as e:
    print(f'     ❌ backend.main import failed: {e}')
    print(f'     ❌ Full error details: {e}')
"

echo ""
echo "7. Directory Listing:"
echo "   - Current directory contents:"
ls -la | head -10 | sed 's/^/     /'
echo "   - Backend directory contents:"
ls -la backend/ 2>/dev/null | sed 's/^/     /' || echo "     ⚠️  backend directory not found"
echo "   - Backend/app directory contents:"
ls -la backend/app/ 2>/dev/null | sed 's/^/     /' || echo "     ⚠️  backend/app directory not found"

echo ""
echo "8. Module Search Test:"
python -c "
import importlib.util
import os

print('   - Testing module search...')

# Test if we can find the backend module
try:
    spec = importlib.util.find_spec('backend')
    if spec:
        print(f'     ✅ Found backend module at: {spec.origin}')
    else:
        print('     ❌ backend module not found by importlib')
except Exception as e:
    print(f'     ❌ Error finding backend module: {e}')

# Test if we can find the backend.app.models module
try:
    spec = importlib.util.find_spec('backend.app.models')
    if spec:
        print(f'     ✅ Found backend.app.models module at: {spec.origin}')
    else:
        print('     ❌ backend.app.models module not found by importlib')
except Exception as e:
    print(f'     ❌ Error finding backend.app.models module: {e}')
"

echo ""
echo "9. Quick Fix Attempt:"
echo "   - Setting PYTHONPATH and testing import..."
export PYTHONPATH=$PWD
python -c "
import sys
import os
sys.path.insert(0, os.getcwd())
try:
    from backend.app.models.requests import PromptRequest
    print('     ✅ Import successful after PYTHONPATH fix!')
except ImportError as e:
    print(f'     ❌ Import still failed: {e}')
"

echo ""
echo "=================================="
echo "🔍 DEBUG DIAGNOSIS COMPLETE"
echo "==================================" 