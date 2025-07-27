#!/bin/bash

echo "🔧 Fixing Codespaces port conflicts..."

# Kill any existing processes on port 8000
echo "📡 Checking for processes on port 8000..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Found processes on port 8000, killing them..."
    lsof -ti :8000 | xargs kill -9
    sleep 2
else
    echo "✅ Port 8000 is free"
fi

# Kill any existing processes on port 5173 (frontend)
echo "📡 Checking for processes on port 5173..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  Found processes on port 5173, killing them..."
    lsof -ti :5173 | xargs kill -9
    sleep 2
else
    echo "✅ Port 5173 is free"
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/lib/python3.11/site-packages/fastapi" ]; then
    echo "📦 Installing backend dependencies..."
    pip install -r backend/requirements-minimal-codespaces.txt
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start backend
echo "🚀 Starting backend server..."
PYTHONPATH=$PWD python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🚀 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Servers started successfully!"
echo "📊 Backend PID: $BACKEND_PID"
echo "📊 Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "💡 To stop servers: kill $BACKEND_PID $FRONTEND_PID" 