<?php
/**
 * SMTP/email configuration for Sundial export notifications.
 *
 * COPY THIS FILE to email-config.php and fill in your real values.
 * Do not commit email-config.php (it is in .gitignore).
 *
 * Use this when environment variables are not available (e.g. .htaccess SetEnv
 * not passed to PHP on your host).
 */
$smtpVars = [
    'SMTP_HOST'           => 'smtp.dreamhost.com',
    'SMTP_USERNAME'       => 'info@sundial.gennetten.org',   // full email address
    'SMTP_PASSWORD'       => 'YOUR_EMAIL_ACCOUNT_PASSWORD',
    'SMTP_FROM_EMAIL'     => 'info@sundial.gennetten.org',
    'NOTIFICATION_EMAIL'  => 'douglas@gennetten.com',
];
foreach ($smtpVars as $k => $v) {
    $_ENV[$k] = $v;
    putenv("$k=$v"); // so getenv() also sees it
}
