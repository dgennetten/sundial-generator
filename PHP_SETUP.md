# PHP Export Logger Setup

The `export-logger.php` file handles export notifications and logging. Follow these steps to configure it for your server.

## Prerequisites

1. **PHP Server** with write permissions for log files
2. **PHPMailer Library** - Download from [PHPMailer GitHub](https://github.com/PHPMailer/PHPMailer)
3. **SMTP Server Access** for sending email notifications

## Installation Steps

### 1. Install PHPMailer

Download PHPMailer and extract it to your server. Update the require paths in `export-logger.php`:

```php
require_once '/path/to/PHPMailer/src/Exception.php';
require_once '/path/to/PHPMailer/src/PHPMailer.php';
require_once '/path/to/PHPMailer/src/SMTP.php';
```

### 2. Configure Environment Variables

Set these environment variables on your server or in your PHP configuration:

```bash
SMTP_HOST=your.smtp.server.com
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
NOTIFICATION_EMAIL=admin@yourdomain.com
```

### 3. Set Up Log Directory

Ensure your server has a writable logs directory. The script will try these locations:
- `./logs`
- `../logs`
- `dirname(__FILE__) . '/logs'`
- `/path/to/your/logs` (configure this path)

### 4. Test the Setup

1. Upload `export-logger.php` to your server
2. Test by making a POST request with export data
3. Check that logs are created and emails are sent

## Security Notes

- Never commit actual credentials to version control
- Use environment variables for all sensitive configuration
- Ensure log directories have appropriate permissions
- Consider using application-specific passwords for SMTP

## Troubleshooting

- Check PHP error logs if emails aren't sending
- Verify SMTP credentials and server settings
- Ensure log directories are writable by the web server
- Test SMTP connection separately if needed