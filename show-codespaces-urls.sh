#!/bin/bash

echo "🌐 Mistral Playground - Access URLs"
echo "==================================="
echo ""

# Check if we're in Codespaces (multiple indicators)
if [ -n "$CODESPACES" ] || [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ] || [ -d "/workspaces" ] || [[ "$(hostname)" == *"-"* && "$(hostname)" != "MacBookPro.lan" ]]; then
    echo "✅ Running in GitHub Codespaces"
    echo ""
    
    # Get the codespace name from environment or hostname
    CODESPACE_NAME=${CODESPACE_NAME:-$(hostname | sed 's/-[0-9]*$//')}
    
    echo "📋 Your Codespaces URLs:"
    echo "   📱 Frontend: https://${CODESPACE_NAME}-5173.app.github.dev"
    echo "   🔧 Backend API: https://${CODESPACE_NAME}-8000.app.github.dev"
    echo "   📚 API Docs: https://${CODESPACE_NAME}-8000.app.github.dev/docs"
    echo ""
    echo "💡 If the above URLs don't work, check the 'PORTS' tab in VS Code"
    echo "   for the exact forwarded port URLs."
    echo ""
    echo "🔍 Port Status:"
    if lsof -i :5173 > /dev/null 2>&1; then
        echo "   ✅ Frontend (5173): Running"
    else
        echo "   ❌ Frontend (5173): Not running"
    fi
    
    if lsof -i :8000 > /dev/null 2>&1; then
        echo "   ✅ Backend (8000): Running"
        echo "   🏥 Health: $(curl -s https://${CODESPACE_NAME}-8000.app.github.dev/health 2>/dev/null | head -1 || echo 'Not responding')"
    else
        echo "   ❌ Backend (8000): Not running"
    fi
    
else
    echo "🏠 Running locally"
    echo ""
    echo "📋 Local URLs:"
    echo "   📱 Frontend: http://localhost:5173"
    echo "   🔧 Backend API: http://localhost:8000"
    echo "   📚 API Docs: http://localhost:8000/docs"
    echo ""
    echo "🔍 Port Status:"
    if lsof -i :5173 > /dev/null 2>&1; then
        echo "   ✅ Frontend (5173): Running"
    else
        echo "   ❌ Frontend (5173): Not running"
    fi
    
    if lsof -i :8000 > /dev/null 2>&1; then
        echo "   ✅ Backend (8000): Running"
        echo "   🏥 Health: $(curl -s http://localhost:8000/health 2>/dev/null | head -1 || echo 'Not responding')"
    else
        echo "   ❌ Backend (8000): Not running"
    fi
fi

echo ""
echo "📝 To start services: .devcontainer/setup-and-start.sh"
echo "📋 To check logs: ./show-logs.sh" 