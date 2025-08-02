#!/bin/bash

# DreamHost Cron Script for Dist-Only Deployment
# This script runs on DreamHost and only handles visitor data updates

# Set the working directory to your DreamHost domain directory
# This should be where your dist folder contents are deployed
PROJECT_DIR="/home/YOUR_USERNAME/YOUR_DOMAIN"
cd "$PROJECT_DIR"

# Set up environment variables for DreamHost
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export NODE_ENV=production

# Log file for debugging
LOG_FILE="$PROJECT_DIR/logs/cron.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Start the update process
log_message "Starting nightly visitor data update..."

# Since we don't have the full project on DreamHost,
# we'll need to fetch the visitor data from your local machine
# or set up a simple API endpoint

# Option 1: If you have a simple API endpoint
# curl -o visitor-data.json https://your-domain.com/api/visitor-data

# Option 2: If you have a simple script that just updates the JSON
# This would be a minimal script that only handles visitor data
if [ -f "update-visitors.js" ]; then
    node update-visitors.js >> "$LOG_FILE" 2>&1
else
    log_message "No visitor update script found"
    echo "❌ No visitor update script found at $(date)"
    exit 1
fi

# Check if the update was successful
if [ $? -eq 0 ]; then
    log_message "Visitor data updated successfully"
    echo "✅ Visitor data updated successfully at $(date)"
else
    log_message "Error updating visitor data"
    echo "❌ Error updating visitor data at $(date)"
    exit 1
fi 