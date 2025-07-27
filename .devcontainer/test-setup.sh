#!/bin/bash

echo "🧪 Testing Mistral Playground Codespaces Setup..."

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "✅ Virtual environment exists"
else
    echo "❌ Virtual environment missing"
    exit 1
fi

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ Environment file exists"
else
    echo "❌ Environment file missing"
    exit 1
fi

# Check if logs directory exists
if [ -d "logs" ]; then
    echo "✅ Logs directory exists"
else
    echo "❌ Logs directory missing"
    exit 1
fi

# Check if backend dependencies are installed
if [ -d "backend" ] && [ -d "venv/lib/python3.11/site-packages/fastapi" ]; then
    echo "✅ Backend dependencies installed"
elif [ -d "backend" ] && [ -d "venv/lib/python3.11/site-packages/uvicorn" ]; then
    echo "✅ Backend dependencies installed (minimal)"
else
    echo "❌ Backend dependencies missing"
    exit 1
fi

# Check if frontend dependencies are installed
if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies missing"
    exit 1
fi

# Check if services are running
if pgrep -f "uvicorn" > /dev/null; then
    echo "✅ Backend service is running"
else
    echo "⚠️  Backend service not running"
fi

if pgrep -f "vite" > /dev/null; then
    echo "✅ Frontend service is running"
else
    echo "⚠️  Frontend service not running"
fi

echo ""
echo "🎉 Setup test completed!"
echo "📋 Services should be available at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs" 