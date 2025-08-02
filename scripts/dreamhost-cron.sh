#!/bin/bash

# DreamHost Shared Hosting Cron Script
# This script is designed to work with DreamHost's shared hosting environment

# Set the working directory to the project root
# Adjust this path to match your DreamHost directory structure
PROJECT_DIR="/home/YOUR_USERNAME/YOUR_DOMAIN/sundial-generator"
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

# Update visitor data for the last 7 days (GDPR compliant)
node scripts/updateVisitorData.js 7 >> "$LOG_FILE" 2>&1

# Check if the update was successful
if [ $? -eq 0 ]; then
    log_message "Visitor data updated successfully"
    echo "✅ Visitor data updated successfully at $(date)"
else
    log_message "Error updating visitor data"
    echo "❌ Error updating visitor data at $(date)"
    exit 1
fi 