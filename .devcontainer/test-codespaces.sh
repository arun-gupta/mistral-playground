#!/bin/bash

echo "🔍 Testing Codespaces Setup..."
echo "================================"

# Check if we're in Codespaces
if [ -n "$CODESPACES" ]; then
    echo "✅ Running in GitHub Codespaces"
else
    echo "⚠️  Not running in GitHub Codespaces"
fi

echo ""
echo "📁 Current directory: $(pwd)"
echo "👤 User: $(whoami)"

echo ""
echo "🐍 Python environment:"
python3 --version 2>/dev/null || echo "❌ Python not found"
which python3

echo ""
echo "📦 Node.js environment:"
node --version 2>/dev/null || echo "❌ Node.js not found"
which node

echo ""
echo "🔧 Virtual environment:"
if [ -d "venv" ]; then
    echo "✅ Virtual environment exists"
    ls -la venv/bin/python* 2>/dev/null || echo "❌ Python executable not found in venv"
else
    echo "❌ Virtual environment not found"
fi

echo ""
echo "📄 Environment file:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "   MOCK_MODE: $(grep MOCK_MODE .env | cut -d'=' -f2 || echo 'not set')"
else
    echo "❌ .env file not found"
fi

echo ""
echo "🚀 Running services:"
echo "Backend (uvicorn):"
ps aux | grep uvicorn | grep -v grep || echo "❌ Backend not running"

echo ""
echo "Frontend (vite):"
ps aux | grep vite | grep -v grep || echo "❌ Frontend not running"

echo ""
echo "🌐 Port status:"
echo "Port 8000 (Backend):"
netstat -tlnp 2>/dev/null | grep :8000 || echo "❌ Port 8000 not listening"

echo ""
echo "Port 5173 (Frontend):"
netstat -tlnp 2>/dev/null | grep :5173 || echo "❌ Port 5173 not listening"

echo ""
echo "📋 Startup log (if exists):"
if [ -f "/tmp/startup.log" ]; then
    echo "✅ Startup log exists"
    echo "Last 10 lines:"
    tail -10 /tmp/startup.log
else
    echo "❌ Startup log not found"
fi

echo ""
echo "🎯 Quick API test:"
if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend API responding"
else
    echo "❌ Backend API not responding"
fi

echo ""
echo "🏠 Quick frontend test:"
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "✅ Frontend responding"
else
    echo "❌ Frontend not responding"
fi

echo ""
echo "================================"
echo "🔍 Test complete!" 