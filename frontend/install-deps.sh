#!/bin/bash

# Install frontend dependencies for Codespaces
echo "Installing frontend dependencies..."

# Install npm dependencies
npm install

# Verify tailwindcss-animate is installed
if npm list tailwindcss-animate > /dev/null 2>&1; then
    echo "✅ tailwindcss-animate is installed"
else
    echo "❌ tailwindcss-animate is missing, installing..."
    npm install tailwindcss-animate
fi

echo "Frontend dependencies installed successfully!" 