#!/bin/bash

echo "🚀 STARTING SERVERS ONLY (No Dependency Installation)"
echo "=================================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "   Run './setup-and-start.sh' first to set up the environment"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate
echo "✅ Virtual environment activated"

# Check if dependencies are installed
echo "🔍 Checking dependencies..."
if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
    echo "❌ Dependencies not found!"
    echo "   Run './setup-and-start.sh' first to install dependencies"
    exit 1
fi
echo "✅ Dependencies found"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting backend server..."
echo "   - Starting uvicorn server on port 8000..."
PYTHONPATH=$PWD python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
echo "   - Waiting for backend to initialize..."
sleep 3

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend server is running"
else
    echo "⚠️  Backend server may not be fully started yet"
fi

# Start frontend
echo ""
echo "🎨 Starting frontend server..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    cd frontend
    echo "   - Starting frontend development server..."
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo "✅ Frontend server started"
else
    echo "   ⚠️  Frontend requires Node.js to run"
fi

echo ""
echo "✅ Services are running!"
echo ""
echo "🎉 Services are running!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Real-time logs are displayed in this terminal!"
echo "🛑 To stop services: Ctrl+C or close this terminal"
echo ""
echo "🚀 Ready to explore!"

# Wait for user to stop
wait 