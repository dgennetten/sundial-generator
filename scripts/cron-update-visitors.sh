#!/bin/bash

# Nightly visitor data update script
# Run this via cron to automatically update visitor data

# Set the working directory to the project root
cd "$(dirname "$0")/.."

# Update visitor data for the last 7 days (GDPR compliant)
echo "$(date): Starting nightly visitor data update..."
node scripts/updateVisitorData.js 7

# Check if the update was successful
if [ $? -eq 0 ]; then
    echo "$(date): Visitor data updated successfully"
else
    echo "$(date): Error updating visitor data"
    exit 1
fi 