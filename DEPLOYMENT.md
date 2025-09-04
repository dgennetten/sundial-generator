# Deployment Guide

This document explains how to deploy the Sundial Generator application.

## Prerequisites

1. A web server with FTP access
2. Node.js and npm installed locally
3. Environment variables configured (see `.env.example`)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your actual credentials:
   - `VITE_GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `FTP_HOST`: Your FTP server hostname
   - `FTP_USER`: Your FTP username
   - `FTP_PASSWORD`: Your FTP password
   - `FTP_REMOTE_PATH`: Your remote directory path

## Deployment Steps

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Copy and configure deployment script:**
   ```bash
   cp deploy.example.js deploy.js
   ```
   
3. **Deploy:**
   ```bash
   node deploy.js
   ```

## Optional: Visitor Data Collection

If you want to collect visitor analytics:

1. Configure SFTP credentials in `.env`:
   - `SFTP_HOST`: Your server hostname
   - `SFTP_USERNAME`: Your SFTP username
   - `SFTP_PASSWORD`: Your SFTP password
   - `SFTP_LOG_PATH`: Path to your server's access logs

2. **Update visitor data:**
   ```bash
   npm run update-visitors-7d
   ```

3. **Build and deploy with updated data:**
   ```bash
   npm run build
   node deploy.js
   ```

## Available Scripts

- `npm run update-visitors`: Update visitor data from logs
- `npm run update-visitors-7d`: Update with last 7 days of data
- `npm run update-visitors-30d`: Update with last 30 days of data
- `npm run debug-logs`: Debug log processing
- `npm run fetch-logs`: Fetch logs from server

## Security Notes

- Never commit your `.env` file to version control
- Keep your API keys and passwords secure
- Use environment variables for all sensitive configuration