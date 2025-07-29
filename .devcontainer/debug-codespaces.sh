#!/bin/bash

echo "🔍 Codespaces Environment Debug"
echo "==============================="
echo "Timestamp: $(date)"
echo ""

echo "📋 Environment Variables:"
echo "  CODESPACES: '$CODESPACES'"
echo "  AUTO_START_SERVICES: '$AUTO_START_SERVICES'"
echo "  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: '$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN'"
echo "  CODESPACE_NAME: '$CODESPACE_NAME'"
echo ""

echo "📋 System Information:"
echo "  Hostname: $(hostname)"
echo "  User: $USER"
echo "  PWD: $PWD"
echo "  HOME: $HOME"
echo ""

echo "📋 Directory Structure:"
echo "  /workspaces exists: $([ -d "/workspaces" ] && echo "✅ YES" || echo "❌ NO")"
echo "  Current workspace: $([ -d "/workspaces/mistral-playground" ] && echo "✅ YES" || echo "❌ NO")"
echo ""

echo "📋 Devcontainer Files:"
echo "  devcontainer.json exists: $([ -f ".devcontainer/devcontainer.json" ] && echo "✅ YES" || echo "❌ NO")"
echo "  startup.sh exists: $([ -f ".devcontainer/startup.sh" ] && echo "✅ YES" || echo "❌ NO")"
echo "  startup.sh executable: $([ -x ".devcontainer/startup.sh" ] && echo "✅ YES" || echo "❌ NO")"
echo ""

echo "📋 Service Status:"
echo "  Backend (8000): $(lsof -i :8000 > /dev/null 2>&1 && echo "✅ RUNNING" || echo "❌ NOT RUNNING")"
echo "  Frontend (5173): $(lsof -i :5173 > /dev/null 2>&1 && echo "✅ RUNNING" || echo "❌ NOT RUNNING")"
echo ""

echo "📋 Log Files:"
echo "  /tmp/startup.log: $([ -f "/tmp/startup.log" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "  /tmp/setup.log: $([ -f "/tmp/setup.log" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "  /tmp/backend.log: $([ -f "/tmp/backend.log" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "  /tmp/frontend.log: $([ -f "/tmp/frontend.log" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo ""

echo "📋 Codespaces Detection Logic:"
echo "  AUTO_START_SERVICES=true: $([ "$AUTO_START_SERVICES" = "true" ] && echo "✅ YES" || echo "❌ NO")"
echo "  CODESPACES set: $([ -n "$CODESPACES" ] && echo "✅ YES" || echo "❌ NO")"
echo "  /workspaces exists: $([ -d "/workspaces" ] && echo "✅ YES" || echo "❌ NO")"
echo "  Not MacBookPro.lan: $([ "$(hostname)" != "MacBookPro.lan" ] && echo "✅ YES" || echo "❌ NO")"
echo ""

echo "🎯 Auto-start would trigger: $([ "$AUTO_START_SERVICES" = "true" ] || [ -n "$CODESPACES" ] || [ -d "/workspaces" ] || [ "$(hostname)" != "MacBookPro.lan" ] && echo "✅ YES" || echo "❌ NO")"
echo ""

echo "📄 Recent startup log (last 10 lines):"
if [ -f "/tmp/startup.log" ]; then
    tail -10 /tmp/startup.log
else
    echo "  No startup log found"
fi
echo ""

echo "📄 Recent setup log (last 10 lines):"
if [ -f "/tmp/setup.log" ]; then
    tail -10 /tmp/setup.log
else
    echo "  No setup log found"
fi 