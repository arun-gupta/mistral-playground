#!/bin/bash

echo "📋 Mistral Playground - Logs and Status"
echo "========================================"
echo ""

# Check if setup log exists
if [ -f "/tmp/setup.log" ]; then
    echo "✅ Setup log found at /tmp/setup.log"
    echo "📄 Last 10 lines of setup log:"
    echo "----------------------------------------"
    tail -10 /tmp/setup.log
    echo "----------------------------------------"
    echo ""
else
    echo "⚠️  No setup log found at /tmp/setup.log"
    echo ""
fi

# Check service status
echo "🔍 Service Status:"
echo "------------------"

# Check backend
if lsof -i :8000 > /dev/null 2>&1; then
    echo "✅ Backend (port 8000): Running"
    echo "   Health check: $(curl -s http://localhost:8000/health 2>/dev/null | head -1 || echo 'Not responding')"
else
    echo "❌ Backend (port 8000): Not running"
fi

# Check frontend
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Frontend (port 5173): Running"
else
    echo "❌ Frontend (port 5173): Not running"
fi

echo ""
echo "📋 Available Commands:"
echo "   📄 View full setup log: cat /tmp/setup.log"
echo "   📄 Follow logs in real-time: tail -f /tmp/setup.log"
echo "   📄 Check service ports: lsof -i :8000,5173"
echo "   📄 Get access URLs: ./show-codespaces-urls.sh"
echo "   📄 Start services: .devcontainer/setup-and-start.sh"
echo ""
echo "🌐 Access URLs:"
echo "   📱 Frontend: Check Codespaces port forwarding for port 5173"
echo "   🔧 Backend API: Check Codespaces port forwarding for port 8000"
echo "   📚 API Docs: Check Codespaces port forwarding for port 8000/docs"
echo ""
echo "💡 Run './show-codespaces-urls.sh' for exact URLs based on your environment" 