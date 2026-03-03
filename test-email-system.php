<?php
/**
 * Email System Test Script for Sundial Generator
 * 
 * This script tests the email notification system to help diagnose issues.
 * Run this script via web browser to test your email configuration.
 * 
 * Usage: Navigate to: https://yourdomain.com/test-email-system.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Add basic security - remove this in production
$allowed_ips = ['127.0.0.1', '::1', 'your.ip.address.here']; // Add your IP address

// Check for bypass parameter - multiple ways to check
$bypassEnabled = false;

// Check $_GET array
if (isset($_GET['allow']) && ($_GET['allow'] == '1' || $_GET['allow'] === true || $_GET['allow'] === '')) {
    $bypassEnabled = true;
}

// Check query string directly
if (!$bypassEnabled && isset($_SERVER['QUERY_STRING'])) {
    $qs = $_SERVER['QUERY_STRING'];
    if (strpos($qs, 'allow=1') !== false || strpos($qs, 'allow=') !== false || $qs === 'allow=1' || $qs === 'allow') {
        $bypassEnabled = true;
    }
}

// Check REQUEST_URI for the parameter
if (!$bypassEnabled && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'allow') !== false) {
    $bypassEnabled = true;
}

if (!in_array($_SERVER['REMOTE_ADDR'], $allowed_ips) && !$bypassEnabled) {
    $current_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    // Remove any existing query parameters to avoid duplicates
    $base_url = strtok($current_url, '?');
    $bypass_url = $base_url . '?allow=1';
    
    $html = '<!DOCTYPE html><html><head><title>Access Denied</title><meta http-equiv="refresh" content="0;url=' . htmlspecialchars($bypass_url) . '"></head><body style="font-family: Arial, sans-serif; padding: 20px;">';
    $html .= '<h2>Access Denied</h2>';
    $html .= '<p>Add <code>?allow=1</code> to the URL to bypass (remove this script after testing).</p>';
    $html .= '<p><strong>Your current URL:</strong> <code>' . htmlspecialchars($current_url) . '</code></p>';
    $html .= '<p><strong>Use this URL instead:</strong><br>';
    $html .= '<a href="' . htmlspecialchars($bypass_url) . '" style="color: #0066cc; font-size: 16px; padding: 10px; display: inline-block; background: #f0f0f0; border: 1px solid #ccc; text-decoration: none; border-radius: 4px; margin: 10px 0;">' . htmlspecialchars($bypass_url) . '</a></p>';
    $html .= '<p><strong>Or click here:</strong> <a href="' . htmlspecialchars($bypass_url) . '">Click to access test page</a></p>';
    $html .= '<p><em>If automatic redirect doesn\'t work, click the link above or copy and paste the URL into your browser.</em></p>';
    $html .= '<hr><p style="color: #666; font-size: 12px;"><strong>Debug Info:</strong><br>';
    $html .= 'Current IP: ' . htmlspecialchars($_SERVER['REMOTE_ADDR']) . '<br>';
    $html .= 'Query String: ' . htmlspecialchars($_SERVER['QUERY_STRING'] ?? 'none') . '<br>';
    $html .= 'REQUEST_URI: ' . htmlspecialchars($_SERVER['REQUEST_URI'] ?? 'none') . '<br>';
    $html .= '$_GET[\'allow\']: ' . (isset($_GET['allow']) ? htmlspecialchars(var_export($_GET['allow'], true)) : 'not set') . '<br>';
    $html .= 'Bypass Enabled: ' . ($bypassEnabled ? 'YES' : 'NO') . '</p>';
    $html .= '</body></html>';
    die($html);
}

header('Content-Type: text/html; charset=UTF-8');

// Load optional local config when .htaccess SetEnv is not available (same as export-logger.php)
$emailConfigPath = __DIR__ . '/email-config.php';
$emailConfigLoaded = file_exists($emailConfigPath);
if ($emailConfigLoaded) {
    require_once $emailConfigPath;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

echo "<!DOCTYPE html><html><head><title>Sundial Email System Test</title></head><body>";
echo "<h1>Sundial Email System Diagnostic Test</h1>";
echo "<p><strong>Date/Time:</strong> " . date('Y-m-d H:i:s') . "</p>";

// Test 1: Check PHPMailer availability
echo "<h2>Test 1: PHPMailer Library Check</h2>";

$phpmailerFound = false;
$phpmailerPath = '';

// Check multiple locations
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
    $phpmailerFound = true;
    $phpmailerPath = 'Composer autoload';
    echo "<div style='color: green;'>✅ PHPMailer found via Composer autoload</div>";
} elseif (file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/src/SMTP.php';
    $phpmailerFound = true;
    $phpmailerPath = __DIR__ . '/PHPMailer';
    echo "<div style='color: green;'>✅ PHPMailer found in local directory</div>";
} else {
    // Try common hosting locations
    $phpmailerPaths = [
        '/home/'.get_current_user().'/PHPMailer',
        '/home/'.get_current_user().'/public_html/PHPMailer',
        __DIR__ . '/../PHPMailer',
        '/usr/share/php/PHPMailer'
    ];
    
    foreach ($phpmailerPaths as $basePath) {
        if (file_exists($basePath . '/src/PHPMailer.php')) {
            require_once $basePath . '/src/Exception.php';
            require_once $basePath . '/src/PHPMailer.php';
            require_once $basePath . '/src/SMTP.php';
            $phpmailerFound = true;
            $phpmailerPath = $basePath;
            echo "<div style='color: green;'>✅ PHPMailer found at: $basePath</div>";
            break;
        }
    }
}

if (!$phpmailerFound) {
    echo "<div style='color: red;'>❌ PHPMailer NOT FOUND. Please install PHPMailer.</div>";
    echo "<p>Checked locations:</p><ul>";
    echo "<li>" . __DIR__ . "/vendor/autoload.php</li>";
    echo "<li>" . __DIR__ . "/PHPMailer/src/PHPMailer.php</li>";
    foreach ($phpmailerPaths as $path) {
        echo "<li>$path/src/PHPMailer.php</li>";
    }
    echo "</ul>";
}

// Test 2: Check environment variables
echo "<h2>Test 2: Environment Variables Check</h2>";
echo "<div><strong>Config file:</strong> " . ($emailConfigLoaded ? "✅ loaded from <code>" . htmlspecialchars($emailConfigPath) . "</code>" : "⚠️ not found at <code>" . htmlspecialchars($emailConfigPath) . "</code> (env vars from .htaccess or system only)") . "</div>";

// Get raw values (check $_ENV first so email-config.php values are seen)
$rawEnvVars = [
    'SMTP_HOST' => $_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST'),
    'SMTP_USERNAME' => $_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME'),
    'SMTP_PASSWORD' => $_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD'),
    'SMTP_FROM_EMAIL' => $_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL'),
    'NOTIFICATION_EMAIL' => $_ENV['NOTIFICATION_EMAIL'] ?? getenv('NOTIFICATION_EMAIL')
];

// Trim values to handle whitespace issues from .htaccess
$envVars = [];
foreach ($rawEnvVars as $var => $value) {
    $trimmed = $value ? trim($value) : '';
    $envVars[$var] = $trimmed;
    
    // Display raw vs trimmed for debugging
    if ($value && $value !== $trimmed) {
        echo "<div style='color: orange;'>⚠️ $var: Had whitespace (raw length: " . strlen($value) . ", trimmed: " . strlen($trimmed) . ")</div>";
    }
    
    if (!empty($trimmed)) {
        if ($var === 'SMTP_PASSWORD') {
            echo "<div style='color: green;'>✅ $var: [SET - " . strlen($trimmed) . " characters]</div>";
        } else {
            echo "<div style='color: green;'>✅ $var: " . htmlspecialchars($trimmed) . "</div>";
        }
    } else {
        echo "<div style='color: orange;'>⚠️ $var: NOT SET or EMPTY</div>";
    }
}

// Validate email format
echo "<h3>Email Validation</h3>";
if (!empty($envVars['SMTP_FROM_EMAIL'])) {
    if (filter_var($envVars['SMTP_FROM_EMAIL'], FILTER_VALIDATE_EMAIL)) {
        echo "<div style='color: green;'>✅ SMTP_FROM_EMAIL is a valid email address</div>";
    } else {
        echo "<div style='color: red;'>❌ SMTP_FROM_EMAIL is NOT a valid email address: " . htmlspecialchars($envVars['SMTP_FROM_EMAIL']) . "</div>";
    }
}

if (!empty($envVars['NOTIFICATION_EMAIL'])) {
    if (filter_var($envVars['NOTIFICATION_EMAIL'], FILTER_VALIDATE_EMAIL)) {
        echo "<div style='color: green;'>✅ NOTIFICATION_EMAIL is a valid email address</div>";
    } else {
        echo "<div style='color: red;'>❌ NOTIFICATION_EMAIL is NOT a valid email address: " . htmlspecialchars($envVars['NOTIFICATION_EMAIL']) . "</div>";
    }
}

// Test 3: Test email sending
echo "<h2>Test 3: Email Sending Test</h2>";

if (!$phpmailerFound) {
    echo "<div style='color: red;'>❌ Cannot test email sending - PHPMailer not found</div>";
} else {
    try {
        $mail = new PHPMailer(true);
        
        // Get SMTP settings with fallbacks and trim to handle whitespace issues
        $smtpHost = trim($_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?? 'smtp.dreamhost.com');
        $smtpUsername = trim($_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME') ?? 'info@sundial.gennetten.org');
        $smtpPassword = trim($_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD') ?? '');
        $smtpFromEmail = trim($_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?? 'info@sundial.gennetten.org');
        $notificationEmail = trim($_ENV['NOTIFICATION_EMAIL'] ?? getenv('NOTIFICATION_EMAIL') ?? 'douglas@gennetten.com');
        
        // Validate that email addresses are not empty after trimming
        if (empty($smtpFromEmail)) {
            echo "<div style='color: orange;'>⚠️ SMTP_FROM_EMAIL is empty, using default: info@sundial.gennetten.org</div>";
            $smtpFromEmail = 'info@sundial.gennetten.org';
        }
        
        if (empty($notificationEmail)) {
            echo "<div style='color: orange;'>⚠️ NOTIFICATION_EMAIL is empty, using default: douglas@gennetten.com</div>";
            $notificationEmail = 'douglas@gennetten.com';
        }
        
        // Validate email formats
        if (!filter_var($smtpFromEmail, FILTER_VALIDATE_EMAIL)) {
            echo "<div style='color: red;'>❌ SMTP_FROM_EMAIL is not a valid email address: " . htmlspecialchars($smtpFromEmail) . "</div>";
        }
        
        if (!filter_var($notificationEmail, FILTER_VALIDATE_EMAIL)) {
            echo "<div style='color: red;'>❌ NOTIFICATION_EMAIL is not a valid email address: " . htmlspecialchars($notificationEmail) . "</div>";
        }
        
        if (empty($smtpPassword)) {
            echo "<div style='color: red;'>❌ Cannot test email - SMTP password not configured</div>";
            echo "<div>Please set SMTP_PASSWORD environment variable or configure it directly.</div>";
        } elseif (empty($smtpUsername)) {
            echo "<div style='color: red;'>❌ Cannot test email - SMTP username not configured</div>";
            echo "<div>Please set SMTP_USERNAME environment variable.</div>";
        } else {
            echo "<div style='color: blue;'>🔄 Attempting to send test email...</div>";
            echo "<div><strong>SMTP Configuration:</strong></div>";
            echo "<ul>";
            echo "<li><strong>Host:</strong> " . htmlspecialchars($smtpHost) . "</li>";
            echo "<li><strong>Port:</strong> 587</li>";
            echo "<li><strong>Security:</strong> TLS</li>";
            echo "<li><strong>Username:</strong> " . htmlspecialchars($smtpUsername) . " (" . strlen($smtpUsername) . " chars)</li>";
            echo "<li><strong>Password:</strong> [SET - " . strlen($smtpPassword) . " characters]</li>";
            echo "<li><strong>From Email:</strong> " . htmlspecialchars($smtpFromEmail) . "</li>";
            echo "<li><strong>To Email:</strong> " . htmlspecialchars($notificationEmail) . "</li>";
            echo "</ul>";
            
            // Show warnings for common issues
            if (strpos($smtpUsername, '@') === false) {
                echo "<div style='color: orange;'>⚠️ WARNING: Username doesn't contain '@' - Dreamhost requires full email address as username</div>";
            }
            if (strlen($smtpPassword) < 6) {
                echo "<div style='color: orange;'>⚠️ WARNING: Password seems too short (" . strlen($smtpPassword) . " chars)</div>";
            }
            
            // Password diagnostic (first and last character only, for debugging)
            if (!empty($smtpPassword)) {
                $firstChar = substr($smtpPassword, 0, 1);
                $lastChar = substr($smtpPassword, -1);
                $hasSpecialChars = preg_match('/[^a-zA-Z0-9]/', $smtpPassword);
                echo "<div style='color: blue; font-size: 12px;'>🔍 Password diagnostic: Length=" . strlen($smtpPassword) . 
                     ", First char='" . htmlspecialchars($firstChar) . "', Last char='" . htmlspecialchars($lastChar) . 
                     "', Has special chars=" . ($hasSpecialChars ? 'Yes' : 'No') . "</div>";
            }
            
            $mail->SMTPDebug = 2; // Enable verbose debug output
            $mail->isSMTP();
            $mail->Host = $smtpHost;
            $mail->SMTPAuth = true;
            $mail->AuthType = 'PLAIN'; // PLAIN often works when LOGIN fails with special chars in password
            $mail->Username = $smtpUsername;
            $mail->Password = trim($smtpPassword); // trim in case config had trailing newline/space
            $mail->SMTPSecure = 'tls';
            $mail->Port = 587;
            
            // Dreamhost-specific settings
            if (strpos($smtpHost, 'dreamhost') !== false) {
                $mail->SMTPOptions = array(
                    'ssl' => array(
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true
                    )
                );
            }

            $mail->setFrom($smtpFromEmail, 'Sundial Generator Test');
            $mail->addAddress($notificationEmail);
            $mail->addReplyTo($smtpFromEmail, 'Sundial Generator Test');

            $mail->isHTML(false);
            $mail->Subject = "Sundial Email System Test - " . date('Y-m-d H:i:s');
            $mail->Body = "This is a test email from the Sundial Generator email system.\n\n";
            $mail->Body .= "If you received this email, the email system is working correctly!\n\n";
            $mail->Body .= "Test performed at: " . date('Y-m-d H:i:s') . "\n";
            $mail->Body .= "Server: " . $_SERVER['SERVER_NAME'] . "\n";
            $mail->Body .= "IP: " . $_SERVER['REMOTE_ADDR'] . "\n";

            echo "<pre style='background: #f0f0f0; padding: 10px; border: 1px solid #ccc;'>";
            $success = $mail->send();
            echo "</pre>";
            
            if ($success) {
                echo "<div style='color: green; font-weight: bold;'>✅ TEST EMAIL SENT SUCCESSFULLY!</div>";
                echo "<div>Check your email inbox (and spam folder) for the test message.</div>";
            } else {
                echo "<div style='color: red; font-weight: bold;'>❌ Failed to send test email</div>";
            }
        }
    } catch (Exception $e) {
        echo "<div style='color: red;'>❌ Email test failed with exception:</div>";
        echo "<div style='background: #ffe0e0; padding: 10px; border: 1px solid #ff0000; margin: 10px 0;'>";
        echo "<strong>Error:</strong> " . $e->getMessage() . "<br>";
        echo "<strong>PHPMailer Error:</strong> " . $mail->ErrorInfo;
        echo "</div>";
    }
}

// Test 4: Test the actual export logger
echo "<h2>Test 4: Export Logger Test</h2>";

if (file_exists(__DIR__ . '/export-logger.php')) {
    echo "<div style='color: green;'>✅ export-logger.php found</div>";
    
    // Test with sample data
    $testData = [
        'exportFormat' => 'TEST',
        'pageSize' => 'Letter',
        'dateRange' => 'FullYear',
        'gnomonType' => 'crosshair',
        'locationName' => 'Test Location',
        'sundialNotesMode' => 'none'
    ];
    
    echo "<div style='color: blue;'>🔄 Testing export logger with sample data...</div>";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($testData)
        ]
    ]);
    
    $url = 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['SERVER_NAME'] . dirname($_SERVER['REQUEST_URI']) . '/export-logger.php';
    echo "<div>Testing URL: $url</div>";
    
    $response = file_get_contents($url, false, $context);
    
    if ($response !== false) {
        $result = json_decode($response, true);
        if ($result) {
            echo "<div style='background: #f0f8ff; padding: 10px; border: 1px solid #4169e1; margin: 10px 0;'>";
            echo "<strong>Export Logger Response:</strong><br>";
            echo "<strong>Success:</strong> " . ($result['success'] ? 'Yes' : 'No') . "<br>";
            echo "<strong>Logged:</strong> " . ($result['logged'] ? 'Yes' : 'No') . "<br>";
            echo "<strong>Email Sent:</strong> " . ($result['emailSent'] ? 'Yes' : 'No') . "<br>";
            if (!$result['emailSent'] && isset($result['emailError'])) {
                echo "<strong>Email Error:</strong> " . $result['emailError'] . "<br>";
            }
            echo "</div>";
        } else {
            echo "<div style='color: red;'>❌ Invalid JSON response from export logger</div>";
            echo "<div>Raw response: " . htmlspecialchars($response) . "</div>";
        }
    } else {
        echo "<div style='color: red;'>❌ Failed to connect to export logger</div>";
    }
} else {
    echo "<div style='color: red;'>❌ export-logger.php not found</div>";
}

// Test 5: Server information
echo "<h2>Test 5: Server Information</h2>";
echo "<div><strong>PHP Version:</strong> " . phpversion() . "</div>";
echo "<div><strong>Server Software:</strong> " . $_SERVER['SERVER_SOFTWARE'] . "</div>";
echo "<div><strong>Document Root:</strong> " . $_SERVER['DOCUMENT_ROOT'] . "</div>";
echo "<div><strong>Script Path:</strong> " . __DIR__ . "</div>";
echo "<div><strong>User:</strong> " . get_current_user() . "</div>";
echo "<div><strong>Current Working Directory:</strong> " . getcwd() . "</div>";

// Test 6: File permissions
echo "<h2>Test 6: File Permissions</h2>";
$filesToCheck = ['export-logger.php', 'logs'];
foreach ($filesToCheck as $file) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        $perms = substr(sprintf('%o', fileperms($path)), -4);
        $writable = is_writable($path) ? 'Yes' : 'No';
        echo "<div><strong>$file:</strong> Permissions: $perms, Writable: $writable</div>";
    } else {
        echo "<div><strong>$file:</strong> Does not exist</div>";
    }
}

echo "<hr>";
echo "<h2>Summary & Next Steps</h2>";

if (!$phpmailerFound) {
    echo "<div style='background: #ffe0e0; padding: 15px; border: 1px solid #ff0000; margin: 10px 0;'>";
    echo "<strong>❌ CRITICAL:</strong> PHPMailer library not found. You must install PHPMailer first.";
    echo "</div>";
} elseif (empty($envVars['SMTP_PASSWORD'])) {
    echo "<div style='background: #fff3cd; padding: 15px; border: 1px solid #ffc107; margin: 10px 0;'>";
    echo "<strong>⚠️ WARNING:</strong> SMTP password not configured. Set the SMTP_PASSWORD environment variable.";
    echo "</div>";
} else {
    echo "<div style='background: #d4edda; padding: 15px; border: 1px solid #28a745; margin: 10px 0;'>";
    echo "<strong>✅ GOOD:</strong> Basic configuration looks correct. If the test email was sent successfully, your system should be working!";
    echo "</div>";
}

echo "<p><strong>Remember to delete this test script after testing for security!</strong></p>";
echo "</body></html>";
?>
