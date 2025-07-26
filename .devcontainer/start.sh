#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting Mistral Playground in Codespaces..."

# Activate virtual environment
source /workspaces/mistral-playground/venv/bin/activate

# Start backend in background
echo "🔧 Starting backend server..."
cd /workspaces/mistral-playground/backend
nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /workspaces/mistral-playground/logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend server..."
cd /workspaces/mistral-playground/frontend
nohup npm run dev -- --host 0.0.0.0 > /workspaces/mistral-playground/logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Save PIDs for cleanup
echo $BACKEND_PID > /workspaces/mistral-playground/logs/backend.pid
echo $FRONTEND_PID > /workspaces/mistral-playground/logs/frontend.pid

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
echo "   Backend:  tail -f /workspaces/mistral-playground/logs/backend.log"
echo "   Frontend: tail -f /workspaces/mistral-playground/logs/frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill \$(cat /workspaces/mistral-playground/logs/backend.pid)"
echo "   kill \$(cat /workspaces/mistral-playground/logs/frontend.pid)"
echo ""
echo "🎯 Mock mode is enabled by default. Edit .env to disable for real models."

# Keep script running
wait 