#!/bin/bash

echo "🔧 Fixing NumPy compatibility issues in Codespaces..."

# Check if we're in Codespaces
if [ -n "$CODESPACES" ]; then
    echo "✅ Running in GitHub Codespaces"
else
    echo "⚠️  Not running in Codespaces, but proceeding anyway..."
fi

# Kill any existing processes on ports 8000 and 5173
echo "🔄 Cleaning up existing processes..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Found processes on port 8000, killing them..."
    lsof -ti :8000 | xargs kill -9
    sleep 2
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  Found processes on port 5173, killing them..."
    lsof -ti :5173 | xargs kill -9
    sleep 2
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Uninstall problematic NumPy version
echo "🗑️  Removing problematic NumPy version..."
pip uninstall -y numpy

# Install compatible NumPy version first
echo "📦 Installing compatible NumPy version..."
pip install "numpy<2.0.0"

# Install requirements based on environment
if [ -n "$CODESPACES" ]; then
    echo "📦 Installing Codespaces requirements..."
    pip install -r backend/requirements-minimal-codespaces.txt
else
    echo "📦 Installing local requirements..."
    pip install -r backend/requirements-local.txt
fi

echo "✅ NumPy compatibility fix completed!"
echo ""
echo "🚀 Starting servers..."

# Start backend server
echo "🔧 Starting backend server..."
PYTHONPATH=$PWD python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started successfully!"
echo "📊 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "💡 To stop servers, run: kill $BACKEND_PID $FRONTEND_PID"
echo "💡 Or use: pkill -f 'uvicorn\|vite'" 