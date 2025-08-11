<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();
header('Content-Type: application/json');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '/home/dgennetten/PHPMailer/src/Exception.php';
require '/home/dgennetten/PHPMailer/src/PHPMailer.php';
require '/home/dgennetten/PHPMailer/src/SMTP.php';

// Get export data from POST request
$data = json_decode(file_get_contents('php://input'), true);

// Extract export details
$exportFormat = $data['exportFormat'] ?? 'Unknown';
$pageSize = $data['pageSize'] ?? 'Unknown';
$dateRange = $data['dateRange'] ?? 'Unknown';
$gnomonType = $data['gnomonType'] ?? 'Unknown';
$locationName = $data['locationName'] ?? 'Unknown';

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
$logEntry = "$date; $time; $locationName; $ipAddress; $exportFormat; $pageSize; $dateRange; $gnomonType\n";

// Log directory path - try multiple locations
$logDir = null;
$logFile = null;
$logSuccess = false;

// Try multiple possible log directory locations
$possibleLogDirs = [
    '/home/dgennetten/sundial.gennetten.org/logs',
    '/home/dgennetten/sundial-generator/logs',
    './logs',
    '../logs',
    dirname(__FILE__) . '/logs'
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
    'phpError' => error_get_last()
];

// Send email notification
$mail = new PHPMailer(true);
$emailSent = false;

try {
    $mail->SMTPDebug = 0;
    $mail->isSMTP();
    $mail->Host = 'smtp.dreamhost.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'support@directory.gennetten.org';
    $mail->Password = 'td!stayAct1ve';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('support@directory.gennetten.org', 'Sundial Generator');
    $mail->addAddress('douglas@gennetten.com');
    $mail->addReplyTo('support@directory.gennetten.org', 'Sundial Generator');

    $mail->isHTML(false);
    $mail->Subject = "Sundial Export: $exportFormat - $pageSize - $dateRange";
    
    $emailBody = "Sundial Export Activity\n\n";
    $emailBody .= "Date: $date\n";
    $emailBody .= "Time: $time\n";
    $emailBody .= "Location: $locationName\n";
    $emailBody .= "IP Address: $ipAddress\n";
    $emailBody .= "Export Format: $exportFormat\n";
    $emailBody .= "Page Size: $pageSize\n";
    $emailBody .= "Date Range: $dateRange\n";
    $emailBody .= "Gnomon Type: $gnomonType\n";
    
    $mail->Body = $emailBody;

    $mail->send();
    $emailSent = true;
} catch (Exception $e) {
    $emailSent = false;
    $emailError = $mail->ErrorInfo;
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
    'debug' => $debugInfo
];

if (!$emailSent) {
    $response['emailError'] = $emailError ?? 'Unknown email error';
}

echo json_encode($response);
exit;
?>
