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

**If the diagnostic shows "SMTP_* NOT SET or EMPTY"**, your server is not passing environment variables to PHP (common when `.htaccess` `SetEnv` is not allowed or `.htaccess` is missing). Use the PHP config file method below.

#### Option A: PHP config file (recommended when env vars are not available)

1. Copy the example file to create your config:
   - In the repo: copy `email-config.example.php` to `email-config.php`
   - Or on the server: in the same directory as `export-logger.php`, create `email-config.php`

2. Edit `email-config.php` and set your real SMTP values:
   ```php
   <?php
   $_ENV['SMTP_HOST']           = 'smtp.dreamhost.com';
   $_ENV['SMTP_USERNAME']       = 'info@sundial.gennetten.org';   // full email address
   $_ENV['SMTP_PASSWORD']       = 'your_actual_email_password';
   $_ENV['SMTP_FROM_EMAIL']     = 'info@sundial.gennetten.org';
   $_ENV['NOTIFICATION_EMAIL']  = 'douglas@gennetten.com';
   ```
3. Deploy: upload `email-config.php` to the server next to `export-logger.php` (e.g. `/home/dgennetten/sundial.gennetten.org/email-config.php`). Do not commit `email-config.php`; it is in `.gitignore`.

Both `export-logger.php` and `test-email-system.php` load this file automatically if it exists.

#### Option B: .htaccess (when your host allows SetEnv)

For Dreamhost or when Apache passes env to PHP, create a `.htaccess` file in your web directory:

```apache
# SMTP Configuration for Dreamhost
SetEnv SMTP_HOST "smtp.dreamhost.com"
SetEnv SMTP_USERNAME "sundial@gennetten.com"
SetEnv SMTP_PASSWORD "your_email_password_here"
SetEnv SMTP_FROM_EMAIL "info@sundial.gennetten.org"
SetEnv NOTIFICATION_EMAIL "douglas@gennetten.com"
```

**Security Note**: Keep `.htaccess` and `email-config.php` out of version control and ensure they are not publicly readable if possible.

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

### 2. "SMTP password not configured" / "SMTP_* NOT SET or EMPTY"
- **Preferred**: Create `email-config.php` on the server (copy from `email-config.example.php`, set real values, upload to same directory as `export-logger.php`). The scripts load it automatically.
- Or set env vars via `.htaccess` if your host allows `SetEnv` and ensure `.htaccess` is deployed.
- Verify the password is correct for your email account.

### 3. SMTP Authentication Errors ("Could not authenticate")
- **Rotate your password**: If you ever shared the SMTP password (e.g. in a chat or ticket), change it in the Dreamhost panel and update `email-config.php`.
- For Dreamhost, use the **full email address** as `SMTP_USERNAME` (e.g. `info@sundial.gennetten.org`).
- In Dreamhost panel: confirm the mail account exists, is active, and that **SMTP / external sending** is allowed for that account.
- If the account has 2FA or “app passwords,” use an **app-specific password** in `SMTP_PASSWORD`, not the main account password.
- Passwords with special characters (`!`, `$`, `"`, etc.): keep the value in **single quotes** in PHP (e.g. `'your!pass'`). Ensure there is **no space or newline** inside the quotes or after the line in `email-config.php`.
- If auth still fails: in Dreamhost panel, **reset the mailbox password** for the sending address, then update `email-config.php` with the new password (type or paste carefully so there’s no trailing space). The scripts use AUTH PLAIN and trim the password to avoid common encoding issues.

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
