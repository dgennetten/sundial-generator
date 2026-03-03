# Export Email System - Complete Guide

## Overview

The Sundial Generator includes an automated email notification system that sends reports whenever users print or export sundials. This system helps track usage and provides valuable analytics.

## ✅ Current Status: WORKING

The export email system is fully operational as of August 30, 2025.

## How It Works

1. **User Action**: When a user clicks "Print" or "Export" in the sundial generator
2. **Frontend Logging**: The React app sends usage data to `export-logger.php`
3. **Server Processing**: The PHP script logs the data and sends an email notification
4. **Email Delivery**: You receive an email with details about the export/print activity

## Files and Components

### Frontend Components
- `src/components/DesignExport.tsx` - The Print/Export UI component
- `src/utils/exportUtils.ts` - Contains logging functions (`logPrintActivity`, `logExportActivity`)

### Backend Components
- `export-logger.php` - Main PHP script that handles logging and email sending
- Server logs stored at: `/home/dgennetten/sundial.gennetten.org/logs/export.log`

### Deployment Scripts
- `deploy.js` - Main deployment script (now includes PHP files)
- `localDeploy.js` - Local deployment script (now includes PHP files)
- `uploadPHP.js` - Standalone script to upload just PHP files
- `deployWithPHP.js` - Alternative deployment script with PHP support

### Testing and Monitoring
- `scripts/checkExportLogger.js` - Health check script
- `test-export-email.js` - Frontend testing script
- `test-export-logger.php` - PHP testing script

## Email Configuration

The system uses PHPMailer with the following SMTP settings:
- **SMTP Server**: smtp.dreamhost.com
- **Port**: 587 (TLS)
- **From**: support@directory.gennetten.org
- **To**: douglas@gennetten.com

## Available NPM Scripts

```bash
# Deploy the app including PHP files (recommended)
npm run deploy
npm run local-deploy

# Upload only PHP files (for quick fixes)
npm run upload-php

# Alternative deployment with explicit PHP support
npm run deploy-with-php

# Check if the export logger is working
npm run check-export-logger

# Test the export logger functionality
node test-export-email.js
```

## Email Content

Each email includes:
- Date and time of export/print
- User's location (if provided)
- IP address
- Export format (PNG, SVG, PDF, or PRINT)
- Page size and orientation
- Date range setting
- Gnomon type
- Decoration mode

## Troubleshooting

### Problem: Export/print email "recently stopped working"

1. **Run the diagnostic script on the server** (fastest check):
   - Open `https://sundial.gennetten.org/test-email-system.php?allow=1` in a browser.
   - It will show: PHPMailer found, env vars (SMTP_PASSWORD set?), and a live send test.
   - If **SMTP password not configured** appears, the server no longer has `SMTP_PASSWORD` (e.g. env cleared after deploy, .htaccess not deployed, or hosting changed how env is set).

2. **Verify env vars on the server**:
   - `SMTP_PASSWORD` must be set (e.g. in `.htaccess` or server env). If it’s empty, the script skips sending and returns `emailSent: false` and `emailError: "SMTP password not configured..."`.
   - Ensure `.htaccess` (with `SetEnv SMTP_PASSWORD "..."`) is deployed with the app; some deploys only upload `dist/` and skip `.htaccess`.

3. **Redeploy PHP and config**:
   ```bash
   npm run upload-php
   ```
   Ensure `export-logger.php` and `.htaccess` are on the server. If you use a different deploy path, confirm the PHP file and env config are included.

4. **Check browser devtools after Export/Print**:
   - In Network, select the request to `export-logger.php` and open the Response.
   - If the body is JSON, look for `emailSent` and `emailError`. If it’s HTML or plain text, the script crashed before sending JSON (check server PHP error logs).

### Problem: No emails being received

1. **Check if the PHP file is deployed**:
   ```bash
   npm run check-export-logger
   ```

2. **If health check fails with 404**:
   ```bash
   npm run upload-php
   ```

3. **Check server logs** (if you have server access):
   - Log file: `/home/dgennetten/sundial.gennetten.org/logs/export.log`
   - PHP error logs on the server

### Problem: Emails sent but logging fails

This usually indicates a permissions issue with the log directory. The system will continue to send emails even if logging fails.

### Problem: Logging works but no emails

This indicates an SMTP configuration issue. Check:
- SMTP credentials (env vars or `export-logger.php` defaults)
- PHPMailer installation at `/home/dgennetten/PHPMailer/` (or Composer `vendor/`)
- Server firewall settings for SMTP

## Development vs Production

The system automatically detects the environment:

- **Development**: Uses `https://sundial.gennetten.org/export-logger.php`
- **Production**: Uses `/export-logger.php` (relative path)

This allows testing during development while ensuring production deployments work correctly.

## Recent Fixes (August 2025)

### Issue
The export email system was broken because the `export-logger.php` file was not being deployed to the server.

### Root Cause
The deployment scripts (`deploy.js` and `localDeploy.js`) only uploaded files from the `dist` directory, but the PHP file was in the root directory.

### Solution
1. ✅ Updated both deployment scripts to include PHP files
2. ✅ Created standalone PHP upload script
3. ✅ Added health check monitoring
4. ✅ Created comprehensive testing tools

### Prevention
- All deployment scripts now automatically include PHP files
- Health check script can be run to verify system status
- Clear documentation and troubleshooting guides

## Maintenance

### Regular Checks
Run the health check periodically:
```bash
npm run check-export-logger
```

### After Code Changes
If you modify the export-logger.php file:
```bash
npm run upload-php
```

### Full Deployment
For regular deployments (includes both app and PHP files):
```bash
npm run deploy
# or
npm run local-deploy
```

## Security Notes

- SMTP credentials are stored in the PHP file (consider moving to environment variables)
- The system logs IP addresses for analytics
- Email content includes user-provided location names
- CORS is enabled for development testing

## Future Improvements

Consider these enhancements:
1. Move SMTP credentials to environment variables
2. Add email templates for better formatting
3. Implement email rate limiting
4. Add database logging in addition to file logging
5. Create a dashboard for viewing export statistics

---

**Last Updated**: August 30, 2025  
**Status**: ✅ Fully Operational  
**Maintainer**: Douglas Gennetten