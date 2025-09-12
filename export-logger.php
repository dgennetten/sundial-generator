<?php
/**
 * Sundial Export Logger
 *
 * Copyright (c) 2025 Sundial Generator
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the Creative Commons Attribution-NonCommercial-ShareAlike
 * 4.0 International License as published by Creative Commons.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * License for more details.
 *
 * You should have received a copy of the Creative Commons
 * Attribution-NonCommercial-ShareAlike 4.0 International License
 * along with this program. If not, see <https://creativecommons.org/licenses/by-nc-sa/4.0/>.
 *
 * Required Environment Variables:
 * - SMTP_HOST: Your SMTP server hostname
 * - SMTP_USERNAME: Your SMTP username/email
 * - SMTP_PASSWORD: Your SMTP password
 * - SMTP_FROM_EMAIL: Email address to send from
 * - NOTIFICATION_EMAIL: Email address to receive notifications
 * 
 * Required Dependencies:
 * - PHPMailer library (configure paths below)
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();

// Add CORS headers to allow requests from localhost during development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Configure these paths for your server - using Composer autoload or manual paths
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    // If using Composer
    require_once __DIR__ . '/vendor/autoload.php';
} elseif (file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php')) {
    // If PHPMailer is in the same directory
    require_once __DIR__ . '/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/src/SMTP.php';
} else {
    // Try common hosting locations
    $phpmailerPaths = [
        '/home/'.get_current_user().'/PHPMailer',
        '/home/'.get_current_user().'/public_html/PHPMailer',
        __DIR__ . '/../PHPMailer',
        '/usr/share/php/PHPMailer'
    ];
    
    $found = false;
    foreach ($phpmailerPaths as $basePath) {
        if (file_exists($basePath . '/src/PHPMailer.php')) {
            require_once $basePath . '/src/Exception.php';
            require_once $basePath . '/src/PHPMailer.php';
            require_once $basePath . '/src/SMTP.php';
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        // Fallback error - log this issue
        error_log("PHPMailer not found in common locations. Please install PHPMailer.");
        echo json_encode([
            'success' => false,
            'emailSent' => false,
            'emailError' => 'PHPMailer library not found. Please install PHPMailer.',
            'debug' => ['phpmailerFound' => false]
        ]);
        exit;
    }
}

// Convert sundialNotesMode to readable format
function formatSundialNotesMode($mode) {
    switch ($mode) {
        case 'none':
            return 'None';
        case 'northPoint':
            return 'Compass Rose';
        case 'seasonsGuide':
            return 'Season Guide';
        case 'textBlock':
            return 'Text Block';
        default:
            return ucfirst($mode);
    }
}

// Get export data from POST request
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

// Check if data was received and parsed correctly
if ($data === null) {
    $data = []; // Fallback to empty array if JSON parsing failed
}

// Extract export details
$exportFormat = $data['exportFormat'] ?? 'Unknown';
$pageSize = $data['pageSize'] ?? 'Unknown';
$dateRange = $data['dateRange'] ?? 'Unknown';
$gnomonType = $data['gnomonType'] ?? 'Unknown';
$locationName = $data['locationName'] ?? 'Unknown';
$sundialNotesMode = $data['sundialNotesMode'] ?? 'Unknown';

$sundialNotesDisplay = formatSundialNotesMode($sundialNotesMode);

// Get current date and time
$date = date('Y-m-d');
$time = date('H:i:s');

// Get IP address
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
} elseif (isset($_SERVER['HTTP_CLIENT_IP'])) {
    $ipAddress = $_SERVER['HTTP_CLIENT_IP'];
}

// Create log entry
$logEntry = "$date; $time; $locationName; $ipAddress; $exportFormat; $pageSize; $dateRange; $gnomonType; $sundialNotesMode\n";

// Log directory path - try multiple locations
$logDir = null;
$logFile = null;
$logSuccess = false;

// Try multiple possible log directory locations
$possibleLogDirs = [
    './logs',
    '../logs',
    dirname(__FILE__) . '/logs',
    '/path/to/your/logs'  // Configure for your server
];

foreach ($possibleLogDirs as $dir) {
    if (is_dir($dir) || mkdir($dir, 0755, true)) {
        if (is_writable($dir)) {
            $logDir = $dir;
            $logFile = $dir . '/export.log';
            break;
        }
    }
}

// If we found a writable directory, try to write the log
if ($logDir && $logFile) {
    $logSuccess = file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // If writing failed, try without file locking
    if ($logSuccess === false) {
        $logSuccess = file_put_contents($logFile, $logEntry, FILE_APPEND);
    }
}

// Debug information for troubleshooting
$debugInfo = [
    'logDir' => $logDir,
    'logFile' => $logFile,
    'logDirExists' => $logDir ? is_dir($logDir) : false,
    'logDirWritable' => $logDir ? is_writable($logDir) : false,
    'logFileWritable' => $logFile ? is_writable($logFile) : false,
    'logSuccess' => $logSuccess,
    'rawInputLength' => strlen($rawInput ?? ''),
    'jsonParseSuccess' => $data !== null,
    'receivedData' => $data,
    'phpError' => error_get_last()
];

// Prepare email body
$emailBody = "Sundial Export Activity\n\n";
$emailBody .= "Date: $date\n";
$emailBody .= "Time: $time\n";
$emailBody .= "Location: $locationName\n";
$emailBody .= "IP Address: $ipAddress\n";
$emailBody .= "Export Format: $exportFormat\n";
$emailBody .= "Page Size: $pageSize\n";
$emailBody .= "Date Range: $dateRange\n";
$emailBody .= "Gnomon Type: $gnomonType\n";
$emailBody .= "Sundial Notes: $sundialNotesDisplay\n";

// Send email notification
$mail = new PHPMailer(true);
$emailSent = false;
$emailError = '';

try {
    // Get SMTP settings - try multiple sources
    $smtpHost = $_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?? 'smtp.dreamhost.com';
    $smtpUsername = $_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME') ?? 'sundial@gennetten.com';
    $smtpPassword = $_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD') ?? '';
    $smtpFromEmail = $_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?? 'sundial@gennetten.com';
    $notificationEmail = $_ENV['NOTIFICATION_EMAIL'] ?? getenv('NOTIFICATION_EMAIL') ?? 'douglas@gennetten.com';
    
    // Skip email if no password is configured
    if (empty($smtpPassword)) {
        $emailSent = false;
        $emailError = 'SMTP password not configured. Please set SMTP_PASSWORD environment variable.';
        
        // Add debug info
        $debugInfo['smtpSettings'] = [
            'host' => $smtpHost,
            'username' => $smtpUsername,
            'hasPassword' => !empty($smtpPassword),
            'fromEmail' => $smtpFromEmail,
            'notificationEmail' => $notificationEmail
        ];
    } else {
        $mail->SMTPDebug = 0; // Set to 2 for debugging
        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->SMTPAuth = true;
        $mail->Username = $smtpUsername;
        $mail->Password = $smtpPassword;
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

        $mail->setFrom($smtpFromEmail, 'Sundial Generator');
        $mail->addAddress($notificationEmail);
        $mail->addReplyTo($smtpFromEmail, 'Sundial Generator');

        $mail->isHTML(false);
        $mail->Subject = "Sundial Export: $exportFormat - $pageSize - $dateRange - $locationName";
        $mail->Body = $emailBody;

        $mail->send();
        $emailSent = true;
        
        // Add success debug info
        $debugInfo['smtpSettings'] = [
            'host' => $smtpHost,
            'username' => $smtpUsername,
            'hasPassword' => !empty($smtpPassword),
            'fromEmail' => $smtpFromEmail,
            'notificationEmail' => $notificationEmail,
            'emailSent' => true
        ];
    }
} catch (Exception $e) {
    $emailSent = false;
    $emailError = $mail->ErrorInfo . ' | Exception: ' . $e->getMessage();
    
    // Enhanced debug info for email failures
    $debugInfo['smtpError'] = [
        'phpmailerError' => $mail->ErrorInfo,
        'exception' => $e->getMessage(),
        'host' => $smtpHost ?? 'not set',
        'username' => $smtpUsername ?? 'not set',
        'hasPassword' => !empty($smtpPassword),
        'port' => $mail->Port ?? 'not set'
    ];
}

// Prepare response
$response = [
    'success' => $logSuccess !== false,
    'logged' => $logSuccess !== false,
    'emailSent' => $emailSent,
    'timestamp' => "$date $time",
    'locationName' => $locationName,
    'ipAddress' => $ipAddress,
    'exportFormat' => $exportFormat,
    'pageSize' => $pageSize,
    'dateRange' => $dateRange,
    'gnomonType' => $gnomonType,
    'sundialNotesMode' => $sundialNotesMode,
    'sundialNotesDisplay' => $sundialNotesDisplay,
    'emailBody' => $emailBody ?? 'Not set',
    'debug' => $debugInfo
];

if (!$emailSent) {
    $response['emailError'] = $emailError ?? 'Unknown email error';
}

echo json_encode($response);
exit;
?>
