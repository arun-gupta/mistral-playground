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

# Check backend - multiple methods
BACKEND_RUNNING=false
if lsof -i :8000 > /dev/null 2>&1; then
    BACKEND_RUNNING=true
elif netstat -tlnp 2>/dev/null | grep :8000 > /dev/null; then
    BACKEND_RUNNING=true
elif ss -tlnp 2>/dev/null | grep :8000 > /dev/null; then
    BACKEND_RUNNING=true
fi

if [ "$BACKEND_RUNNING" = true ]; then
    echo "✅ Backend (port 8000): Running"
    # Try health check with timeout
    HEALTH_CHECK=$(timeout 3 curl -s http://localhost:8000/health 2>/dev/null | head -1 || echo 'Not responding')
    echo "   Health check: $HEALTH_CHECK"
else
    echo "❌ Backend (port 8000): Not running"
fi

# Check frontend - multiple methods
FRONTEND_RUNNING=false
if lsof -i :5173 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
elif netstat -tlnp 2>/dev/null | grep :5173 > /dev/null; then
    FRONTEND_RUNNING=true
elif ss -tlnp 2>/dev/null | grep :5173 > /dev/null; then
    FRONTEND_RUNNING=true
fi

if [ "$FRONTEND_RUNNING" = true ]; then
    echo "✅ Frontend (port 5173): Running"
else
    echo "❌ Frontend (port 5173): Not running"
fi

echo ""
echo "📋 Available Commands:"
echo "# 📄 View full setup log:"
echo "# cat /tmp/setup.log"
echo ""
echo "# 📄 Follow logs in real-time:"
echo "# tail -f /tmp/setup.log"
echo ""
echo "# 📄 Check service ports:"
echo "# lsof -i :8000,5173"
echo ""
echo "# 📄 Get access URLs:"
echo "# ./show-codespaces-urls.sh"
echo ""
echo "# 📄 Start services:"
echo "# ./start-services.sh"
echo ""
echo "🌐 Access URLs:"
echo "   📱 Frontend: Check Codespaces port forwarding for port 5173"
echo "   🔧 Backend API: Check Codespaces port forwarding for port 8000"
echo "   📚 API Docs: Check Codespaces port forwarding for port 8000/docs"
echo ""
echo "💡 Run './show-codespaces-urls.sh' for exact URLs based on your environment" 