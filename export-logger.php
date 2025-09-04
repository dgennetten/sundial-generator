<?php
/**
 * Sundial Export Logger
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

// Configure these paths for your server
require_once 'path/to/PHPMailer/src/Exception.php';
require_once 'path/to/PHPMailer/src/PHPMailer.php';
require_once 'path/to/PHPMailer/src/SMTP.php';

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

try {
    $mail->SMTPDebug = 0;
    $mail->isSMTP();
    $mail->Host = $_ENV['SMTP_HOST'] ?? 'your.smtp.server.com';
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['SMTP_USERNAME'] ?? 'your-email@domain.com';
    $mail->Password = $_ENV['SMTP_PASSWORD'] ?? 'your-password';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@yourdomain.com', 'Sundial Generator');
    $mail->addAddress($_ENV['NOTIFICATION_EMAIL'] ?? 'admin@yourdomain.com');
    $mail->addReplyTo($_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@yourdomain.com', 'Sundial Generator');

    $mail->isHTML(false);
    $mail->Subject = "Sundial Export: $exportFormat - $pageSize - $dateRange";
    $mail->Body = $emailBody;

    $mail->send();
    $emailSent = true;
} catch (Exception $e) {
    $emailSent = false;
    $emailError = $mail->ErrorInfo . ' | Exception: ' . $e->getMessage();
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
