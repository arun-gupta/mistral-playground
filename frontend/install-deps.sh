#!/bin/bash

# Frontend dependency installation script for Codespaces
echo "🎨 Installing frontend dependencies..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the frontend directory"
    exit 1
fi

# Clean install to ensure all dependencies are properly installed
echo "🧹 Cleaning existing node_modules..."
rm -rf node_modules package-lock.json

echo "📦 Installing npm dependencies..."
npm install

# Verify tailwindcss-animate is installed
echo "🔍 Verifying tailwindcss-animate installation..."
if npm list tailwindcss-animate > /dev/null 2>&1; then
    echo "✅ tailwindcss-animate is installed"
else
    echo "❌ tailwindcss-animate is missing, installing explicitly..."
    npm install tailwindcss-animate
fi

# Double-check the installation
if npm list tailwindcss-animate > /dev/null 2>&1; then
    echo "✅ tailwindcss-animate installation verified"
else
    echo "❌ Failed to install tailwindcss-animate"
    exit 1
fi

echo "🎉 Frontend dependencies installed successfully!" 