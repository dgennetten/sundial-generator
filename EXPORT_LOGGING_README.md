# Export Logging System

This document describes the export logging system that tracks all sundial export activities and sends email notifications.

## Overview

The export logging system automatically logs every sundial export with the following information:
- Date and time
- Location name (e.g., "Fort Collins, CO USA")
- IP address of the user
- Export format (PNG, SVG, PDF)
- Page size (Letter, A4, 11x17, 10x15cm Postcard, Custom)
- Date range (FullYear, SummerToFall, WinterToSpring)
- Gnomon type (crosshair, popup, popup-with-brace, crosshair-with-north)

## Files

### 1. `export-logger.php`
The main PHP script that handles logging and email notifications.

**Location**: Place this file in your web server's document root (same directory as your sundial app).

**Features**:
- Logs export activity to `/home/dgennetten/logs/export.log`
- Sends email notifications to `douglas@gennetten.com`
- Uses the same SMTP configuration as your existing 2FA system
- Handles IP address detection (including proxy/forwarded IPs)

### 2. Modified Sundial App Files
The following files have been updated to support export logging:

- `src/components/DesignExport.tsx` - Added props for dateRange and gnomonType
- `src/utils/exportUtils.ts` - Added logging function call after successful exports
- `src/types/sundial.ts` - Extended ExportOptions interface
- `src/App.tsx` - Passes required data to DesignExport component

## Setup Instructions

### 1. Upload PHP Script
Upload `export-logger.php` to your web server's document root (same directory as your sundial app).

### 2. Create Log Directory
Ensure the log directory exists and is writable:
```bash
mkdir -p /home/dgennetten/logs
chmod 755 /home/dgennetten/logs
```

### 3. Verify PHPMailer Installation
Ensure PHPMailer is installed at `/home/dgennetten/PHPMailer/` (same as your 2FA system).

### 4. Test the System
1. Open your sundial app
2. Configure a sundial design
3. Export in any format (PNG or SVG)
4. Check the log file: `/home/dgennetten/logs/export.log`
5. Check your email for the notification

## Log Format

Each log entry follows this format:
```
YYYY-MM-DD; HH:MM:SS; LOCATION_NAME; IP_ADDRESS; EXPORT_FORMAT; PAGE_SIZE; DATE_RANGE; GNOMON_TYPE
```

Example:
```
2024-01-15; 14:30:25; Fort Collins, CO USA; 192.168.1.100; PNG; Letter; SummerToFall; crosshair-with-north
```

## Email Notifications

### Subject Line Format
```
Sundial Export: {FORMAT} - {PAGE_SIZE} - {DATE_RANGE}
```

Example:
```
Sundial Export: PNG - Letter - SummerToFall
```

### Email Body
The email contains all export details in a readable format:
```
Sundial Export Activity

Date: 2024-01-15
Time: 14:30:25
Location: Fort Collins, CO USA
IP Address: 192.168.1.100
Export Format: PNG
Page Size: Letter
Date Range: SummerToFall
Gnomon Type: crosshair-with-north
```

## Configuration

### SMTP Settings
The script uses the same SMTP configuration as your 2FA system:
- Host: `smtp.dreamhost.com`
- Port: `587`
- Security: `TLS`
- Username: `support@directory.gennetten.org`
- Password: `td!stayAct1ve`

### Log File Path
- Default: `/home/dgennetten/logs/export.log`
- To change: Modify the `$logDir` variable in `export-logger.php`

### Email Recipient
- Default: `douglas@gennetten.com`
- To change: Modify the `addAddress()` call in `export-logger.php`

## Troubleshooting

### Common Issues

1. **Log file not created**
   - Check directory permissions
   - Verify PHP has write access to `/home/dgennetten/logs/`

2. **Email not sent**
   - Check SMTP credentials
   - Verify PHPMailer installation path
   - Check server logs for SMTP errors

3. **IP address shows as "Unknown"**
   - Check if your server is behind a proxy
   - Verify `$_SERVER` variables are properly set

### Debug Mode
To enable debug mode, change this line in `export-logger.php`:
```php
$mail->SMTPDebug = 0; // Change to 2 for debugging
```

## Security Considerations

- The log file contains IP addresses and export details
- Ensure the log directory is not publicly accessible
- Consider log rotation to prevent large log files
- The email contains the same information as the log file

## Integration with Existing Systems

This logging system is designed to work alongside your existing 2FA system:
- Uses the same PHPMailer installation
- Uses the same SMTP configuration
- Follows similar error handling patterns
- Maintains the same security practices

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check the server error logs
3. Verify file permissions and paths
4. Test SMTP connectivity separately
