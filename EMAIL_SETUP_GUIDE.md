# Email Setup Guide for Sundial Export Notifications

## Overview

The email notification system sends you an email every time someone exports or prints a sundial from your app. This guide will help you set up and troubleshoot the email functionality.

## Required Setup Steps

### 1. Install PHPMailer

The system needs PHPMailer to send emails. You have several options:

#### Option A: Using Composer (Recommended)
```bash
composer require phpmailer/phpmailer
```

#### Option B: Manual Installation
1. Download PHPMailer from https://github.com/PHPMailer/PHPMailer
2. Extract to your server in one of these locations:
   - Same directory as `export-logger.php`
   - `/home/yourusername/PHPMailer/`
   - `/home/yourusername/public_html/PHPMailer/`

### 2. Configure SMTP Settings

You need to set environment variables for your SMTP configuration. For Dreamhost, create a `.htaccess` file in your web directory with:

```apache
# SMTP Configuration for Dreamhost
SetEnv SMTP_HOST "smtp.dreamhost.com"
SetEnv SMTP_USERNAME "sundial@gennetten.com"
SetEnv SMTP_PASSWORD "your_email_password_here"
SetEnv SMTP_FROM_EMAIL "info@sundial.gennetten.org"
SetEnv NOTIFICATION_EMAIL "douglas@gennetten.com"
```

**Security Note**: Make sure your `.htaccess` file is not accessible via web browser.

### 3. Alternative Configuration Methods

If environment variables don't work, you can also:

#### Option A: Create a PHP config file
Create `email-config.php`:
```php
<?php
// Email configuration - keep this file secure!
$_ENV['SMTP_HOST'] = 'smtp.dreamhost.com';
$_ENV['SMTP_USERNAME'] = 'sundial@gennetten.com';
$_ENV['SMTP_PASSWORD'] = 'your_password_here';
$_ENV['SMTP_FROM_EMAIL'] = 'sundial@gennetten.com';
$_ENV['NOTIFICATION_EMAIL'] = 'douglas@gennetten.com';
?>
```

Then include it in `export-logger.php` by adding this line after the session_start():
```php
include_once 'email-config.php';
```

#### Option B: Direct modification (less secure)
You can directly modify the default values in `export-logger.php`:
```php
$smtpHost = $_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?? 'smtp.dreamhost.com';
$smtpUsername = $_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME') ?? 'sundial@gennetten.com';
$smtpPassword = $_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD') ?? 'YOUR_ACTUAL_PASSWORD_HERE';
$smtpFromEmail = $_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?? 'info@sundial.gennetten.org';
```

## Dreamhost-Specific Settings

For Dreamhost hosting, use these settings:
- **SMTP Host**: `smtp.dreamhost.com`
- **Port**: `587`
- **Security**: `TLS`
- **Username**: Your full email address (e.g., `sundial@gennetten.com`)
- **Password**: Your email account password

## Testing the Email System

Use the test script (see `test-email-system.php` below) to verify everything works.

## Common Issues and Solutions

### 1. "PHPMailer library not found"
- Install PHPMailer using one of the methods above
- Check file permissions on the PHPMailer directory

### 2. "SMTP password not configured"
- Set the `SMTP_PASSWORD` environment variable
- Check that your `.htaccess` file is in the correct location
- Verify the password is correct for your email account

### 3. SMTP Authentication Errors
- Verify your email username and password
- For Dreamhost, ensure you're using the full email address as username
- Check that your email account exists and is active

### 4. SSL/TLS Errors
- The script includes Dreamhost-specific SSL settings
- Try changing `SMTPSecure` from `'tls'` to `'ssl'` and port from `587` to `465`

### 5. Emails Not Arriving
- Check spam/junk folders
- Verify the `NOTIFICATION_EMAIL` address is correct
- Test with the diagnostic script below

## Debugging

Set `$mail->SMTPDebug = 2;` in the script to get detailed SMTP debugging output.

## Security Considerations

1. Never commit email passwords to version control
2. Use environment variables or secure config files
3. Restrict access to configuration files
4. Consider using app-specific passwords if available
5. Regularly rotate email passwords

## Support

If you continue to have issues:
1. Run the test script and check the output
2. Check your server's error logs
3. Contact your hosting provider for SMTP support
4. Verify your email account settings in your hosting control panel
