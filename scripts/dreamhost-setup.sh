#!/bin/bash

# DreamHost Shared Hosting Setup Script
# Run this once to configure your environment

echo "=== DreamHost Shared Hosting Setup ==="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from your project root directory"
    exit 1
fi

# Check Node.js version
echo "📦 Checking Node.js version..."
node --version
if [ $? -ne 0 ]; then
    echo "❌ Error: Node.js not found. Please install Node.js on your DreamHost account"
    exit 1
fi

# Check npm
echo "📦 Checking npm..."
npm --version
if [ $? -ne 0 ]; then
    echo "❌ Error: npm not found"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Test the visitor update script
echo "🧪 Testing visitor update script..."
node scripts/updateVisitorData.js 7

if [ $? -eq 0 ]; then
    echo "✅ Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. SSH into your DreamHost account"
    echo "2. Navigate to your project directory"
    echo "3. Run: crontab -e"
    echo "4. Add the cron job line (see instructions below)"
else
    echo "❌ Error: Visitor update script failed"
    exit 1
fi 