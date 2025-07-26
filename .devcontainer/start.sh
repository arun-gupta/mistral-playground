#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting Mistral Playground in Codespaces..."

# Get the workspace directory
WORKSPACE_DIR=$(pwd)
echo "📁 Starting services from: $WORKSPACE_DIR"

# Activate virtual environment
source $WORKSPACE_DIR/venv/bin/activate

# Start backend in background
echo "🔧 Starting backend server..."
cd $WORKSPACE_DIR/backend
nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > $WORKSPACE_DIR/logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend server..."
cd $WORKSPACE_DIR/frontend
nohup npm run dev -- --host 0.0.0.0 > $WORKSPACE_DIR/logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Save PIDs for cleanup
echo $BACKEND_PID > $WORKSPACE_DIR/logs/backend.pid
echo $FRONTEND_PID > $WORKSPACE_DIR/logs/frontend.pid

# Wait a moment for frontend to start
sleep 5

echo "✅ Mistral Playground is starting up!"
echo ""
echo "🌐 Services:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend:    http://localhost:5173"
echo "   API Docs:    http://localhost:8000/docs"
echo ""
echo "📊 Logs:"
echo "   Backend:  tail -f $WORKSPACE_DIR/logs/backend.log"
echo "   Frontend: tail -f $WORKSPACE_DIR/logs/frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill \$(cat $WORKSPACE_DIR/logs/backend.pid)"
echo "   kill \$(cat $WORKSPACE_DIR/logs/frontend.pid)"
echo ""
echo "🎯 Mock mode is enabled by default. Edit .env to disable for real models."

# Keep script running
wait 