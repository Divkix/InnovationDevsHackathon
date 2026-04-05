#!/bin/bash
set -e

echo "=== InsureScope Environment Setup ==="

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed"
  exit 1
fi
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env file..."
  cat > .env << 'EOF'
# Gemini API Key (optional - for AI-powered coverage explanations)
VITE_GEMINI_API_KEY=
EOF
fi

echo "=== Setup Complete ==="
