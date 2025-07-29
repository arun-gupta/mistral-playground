#!/bin/bash

echo "🚀 Mistral Playground - Automatic Startup"
echo "========================================="

# Make all scripts executable
chmod +x .devcontainer/setup-and-start.sh
chmod +x start-services.sh
chmod +x show-logs.sh
chmod +x show-codespaces-urls.sh
chmod +x welcome-message.sh

# Add bashrc additions
if ! grep -q "bashrc-additions" ~/.bashrc; then
    echo "source .devcontainer/bashrc-additions" >> ~/.bashrc
fi

# Check if we should auto-start services
if [ "$AUTO_START_SERVICES" = "true" ] || [ -n "$CODESPACES" ]; then
    echo "🔄 Auto-starting services..."
    ./start-services.sh
else
    echo "📋 Services not auto-started."
    echo "   Run './start-services.sh' to start them manually."
fi

echo ""
echo "✅ Setup complete!"
echo "📋 Run './welcome-message.sh' for help"
echo "📋 Run './show-codespaces-urls.sh' to get your URLs" 