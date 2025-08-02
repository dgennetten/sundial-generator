#!/bin/bash

# Build and Deploy Script for DreamHost
# This script builds locally and deploys only the dist folder

echo "=== Building and Deploying to DreamHost ==="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from your project root directory"
    exit 1
fi

# Update visitor data first
echo "📊 Updating visitor data..."
node scripts/updateVisitorData.js 7

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to update visitor data"
    exit 1
fi

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

# Deploy to DreamHost (you'll need to customize this part)
echo "🚀 Deploying to DreamHost..."

# Option 1: Using rsync (recommended)
# rsync -avz --delete dist/ YOUR_USERNAME@YOUR_DOMAIN.com:~/YOUR_DOMAIN/

# Option 2: Using scp
# scp -r dist/* YOUR_USERNAME@YOUR_DOMAIN.com:~/YOUR_DOMAIN/

# Option 3: Using git (if you have a separate deployment repo)
# git add dist/
# git commit -m "Deploy updated visitor data"
# git push origin main

echo "✅ Build and deploy completed!"
echo ""
echo "Note: You'll need to customize the deployment command above"
echo "based on your specific DreamHost setup." 