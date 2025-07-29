#!/bin/bash

echo "🚀 Starting Mistral Playground Services..."
echo "=========================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0
    elif netstat -tlnp 2>/dev/null | grep :$port > /dev/null; then
        return 0
    elif ss -tlnp 2>/dev/null | grep :$port > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if check_port $port; then
            echo "✅ $service_name is ready on port $port"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start on port $port"
    return 1
}

# Kill any existing processes
echo "🔧 Checking for existing processes..."
if check_port 8000; then
    echo "⚠️  Killing existing backend processes on port 8000..."
    pkill -f "uvicorn.*8000" 2>/dev/null || true
    sleep 2
fi

if check_port 5173; then
    echo "⚠️  Killing existing frontend processes on port 5173..."
    pkill -f "vite.*5173" 2>/dev/null || true
    sleep 2
fi

# Start backend
echo ""
echo "🔧 Starting Backend Server..."
cd /workspaces/mistral-playground
source venv/bin/activate
export PYTHONPATH=/workspaces/mistral-playground

# Start backend in background
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
if wait_for_service 8000 "Backend"; then
    echo "✅ Backend is running and ready"
else
    echo "❌ Backend failed to start properly"
    echo "📄 Backend logs:"
    cat /tmp/backend.log
fi

# Start frontend
echo ""
echo "🎨 Starting Frontend Server..."
cd /workspaces/mistral-playground/frontend

# Start frontend in background
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
if wait_for_service 5173 "Frontend"; then
    echo "✅ Frontend is running and ready"
else
    echo "❌ Frontend failed to start properly"
    echo "📄 Frontend logs:"
    cat /tmp/frontend.log
fi

echo ""
echo "🎉 Service Startup Complete!"
echo "============================"
echo "📱 Frontend: Check Codespaces port forwarding for port 5173"
echo "🔧 Backend API: Check Codespaces port forwarding for port 8000"
echo "📚 API Docs: Check Codespaces port forwarding for port 8000/docs"
echo ""
echo "📋 Quick Commands:"
echo "   📄 Check status: ./show-logs.sh"
echo "   🌐 Get URLs: ./show-codespaces-urls.sh"
echo "   📊 Full status: ./show-logs.sh && ./show-codespaces-urls.sh"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo "   Setup: tail -f /tmp/setup.log"
echo ""
echo "�� Ready to explore!" 