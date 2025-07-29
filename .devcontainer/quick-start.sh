#!/bin/bash

echo "🚀 Quick Start - Mistral Playground Services"
echo "============================================"

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

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run the full setup first."
    exit 1
fi

source venv/bin/activate
export PYTHONPATH=/workspaces/mistral-playground

# Start backend in background
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if check_port 8000; then
        echo "✅ Backend is ready on port 8000"
        break
    fi
    echo "   Attempt $i/30 - waiting..."
    sleep 2
done

# Start frontend
echo ""
echo "🎨 Starting Frontend Server..."
cd /workspaces/mistral-playground/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Frontend dependencies not found. Please run the full setup first."
    exit 1
fi

# Start frontend in background
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
for i in {1..30}; do
    if check_port 5173; then
        echo "✅ Frontend is ready on port 5173"
        break
    fi
    echo "   Attempt $i/30 - waiting..."
    sleep 2
done

echo ""
echo "🎉 Quick Start Complete!"
echo "========================"
echo "📱 Frontend: Check Codespaces port forwarding for port 5173"
echo "🔧 Backend API: Check Codespaces port forwarding for port 8000"
echo "📚 API Docs: Check Codespaces port forwarding for port 8000/docs"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "📋 Quick Commands:"
echo "   ./show-logs.sh"
echo "   ./show-codespaces-urls.sh"
echo ""
echo "�� Ready to explore!" 