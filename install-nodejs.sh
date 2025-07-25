#!/bin/bash

# Node.js Installation Helper Script for Mistral Playground

echo "🔧 Node.js Installation Helper"
echo "=============================="

# Check if Node.js is already installed
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo "✅ Node.js is already installed!"
    echo "   Node.js version: $(node --version)"
    echo "   npm version: $(npm --version)"
    exit 0
fi

echo "❌ Node.js not found. Installing..."

# Check if Homebrew is available
if command -v brew &> /dev/null; then
    echo "🍺 Homebrew found. Installing Node.js using Homebrew..."
    brew install node
    
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        echo "✅ Node.js installed successfully!"
        echo "   Node.js version: $(node --version)"
        echo "   npm version: $(npm --version)"
        echo ""
        echo "🎉 You can now run: ./start-dev.sh"
        exit 0
    else
        echo "❌ Installation failed. Please try manual installation."
    fi
else
    echo "❌ Homebrew not found."
    echo ""
    echo "📦 Please install Node.js manually:"
    echo ""
    echo "Option 1 - Install Homebrew first, then Node.js:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "  brew install node"
    echo ""
    echo "Option 2 - Download from official website:"
    echo "  Visit https://nodejs.org/ and download the LTS version"
    echo ""
    echo "Option 3 - Using nvm (Node Version Manager):"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install --lts"
    echo "  nvm use --lts"
    echo ""
    echo "After installing Node.js, run: ./start-dev.sh"
    exit 1
fi 