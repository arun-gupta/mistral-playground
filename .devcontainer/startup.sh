#!/bin/bash

# Create log directory if it doesn't exist
mkdir -p /tmp

echo "🚀 Mistral Playground - Automatic Startup" | tee /tmp/startup.log
echo "=========================================" | tee -a /tmp/startup.log
echo "Timestamp: $(date)" | tee -a /tmp/startup.log
echo "Environment: CODESPACES='$CODESPACES', AUTO_START_SERVICES='$AUTO_START_SERVICES'" | tee -a /tmp/startup.log
echo "Hostname: $(hostname)" | tee -a /tmp/startup.log
echo "PWD: $PWD" | tee -a /tmp/startup.log

# Make all scripts executable
echo "Making scripts executable..." | tee -a /tmp/startup.log
chmod +x .devcontainer/setup-and-start.sh
chmod +x .devcontainer/quick-start.sh
chmod +x show-logs.sh
chmod +x show-codespaces-urls.sh
chmod +x welcome-message.sh
echo "Scripts made executable" | tee -a /tmp/startup.log

# Add bashrc additions
echo "Setting up bashrc..." | tee -a /tmp/startup.log
if ! grep -q "bashrc-additions" ~/.bashrc; then
    echo "source .devcontainer/bashrc-additions" >> ~/.bashrc
    echo "Bashrc updated" | tee -a /tmp/startup.log
else
    echo "Bashrc already configured" | tee -a /tmp/startup.log
fi

# Check if we should auto-start services
# Force auto-start in Codespaces by checking multiple indicators
echo "Checking auto-start conditions..." | tee -a /tmp/startup.log
echo "AUTO_START_SERVICES: '$AUTO_START_SERVICES'" | tee -a /tmp/startup.log
echo "CODESPACES: '$CODESPACES'" | tee -a /tmp/startup.log
echo "Hostname: '$(hostname)'" | tee -a /tmp/startup.log
echo "Workspaces dir exists: $([ -d "/workspaces" ] && echo "yes" || echo "no")" | tee -a /tmp/startup.log

if [ "$AUTO_START_SERVICES" = "true" ] || [ -n "$CODESPACES" ] || [ -d "/workspaces" ] || [ "$(hostname)" != "MacBookPro.lan" ]; then
    echo "🔄 Auto-starting services..." | tee -a /tmp/startup.log
    echo "📄 Logs will be saved to /tmp/setup.log" | tee -a /tmp/startup.log
    .devcontainer/setup-and-start.sh > /tmp/setup.log 2>&1 &
    echo "✅ Services starting in background. Check logs with: tail -f /tmp/setup.log" | tee -a /tmp/startup.log
else
    echo "📋 Services not auto-started." | tee -a /tmp/startup.log
    echo "   Run '.devcontainer/setup-and-start.sh' to start them manually." | tee -a /tmp/startup.log
fi

echo "" | tee -a /tmp/startup.log
echo "✅ Setup complete!" | tee -a /tmp/startup.log
echo "📋 Run './welcome-message.sh' for help" | tee -a /tmp/startup.log
echo "📋 Run './show-codespaces-urls.sh' to get your URLs" | tee -a /tmp/startup.log
echo "📄 Full startup log: /tmp/startup.log" | tee -a /tmp/startup.log 