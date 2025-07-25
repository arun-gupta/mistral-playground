#!/bin/bash

echo "🔐 Generating Secure Secret Key for Mistral Playground"
echo "=" * 50

# Check if openssl is available
if command -v openssl &> /dev/null; then
    echo "✅ Using OpenSSL to generate secure key..."
    SECRET_KEY=$(openssl rand -hex 32)
    echo "Generated Secret Key: $SECRET_KEY"
elif command -v python3 &> /dev/null; then
    echo "✅ Using Python to generate secure key..."
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    echo "Generated Secret Key: $SECRET_KEY"
else
    echo "❌ Neither OpenSSL nor Python found. Please install one of them."
    echo "Alternative: Use an online generator or create a random 64-character hex string."
    exit 1
fi

echo ""
echo "📝 To use this key:"
echo "1. Copy the generated key above"
echo "2. Open your .env file"
echo "3. Replace 'your-secret-key-here' with the generated key"
echo ""
echo "Example .env entry:"
echo "SECRET_KEY=$SECRET_KEY"
echo ""
echo "⚠️  Important:"
echo "- Keep this key secret and secure"
echo "- Use different keys for development and production"
echo "- Never commit the actual key to version control" 