#!/bin/bash

echo ""
echo "🎉 Welcome to Mistral Playground!"
echo "=================================="
echo ""

# Check if services are running
echo "🔍 Checking service status..."
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
else
    echo "❌ Backend (port 8000): Not running"
fi

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
echo "📋 Quick Commands:"
echo "   🚀 Start services: ./start-services.sh"
echo "   📄 Check logs: ./show-logs.sh"
echo "   🌐 Get URLs: ./show-codespaces-urls.sh"
echo "   📊 Full status: ./show-logs.sh && ./show-codespaces-urls.sh"
echo ""

# Check if we're in Codespaces
if [ -n "$CODESPACES" ] || [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
    echo "🌐 Codespaces Environment Detected!"
    echo "   💡 Check the 'PORTS' tab in VS Code for forwarded URLs"
    echo "   💡 Or run: ./show-codespaces-urls.sh"
    echo ""
fi

echo "📚 Documentation:"
echo "   📖 README: cat README.md"
echo "   🔧 API Docs: Check the URLs above"
echo "   🐛 Troubleshooting: cat TROUBLESHOOTING.md"
echo ""

echo "🎯 Next Steps:"
echo "   1. Run './show-codespaces-urls.sh' to get your access URLs"
echo "   2. Open the frontend URL in your browser"
echo "   3. Explore the Model Manager and other features!"
echo ""

echo "🚀 Happy coding!" 