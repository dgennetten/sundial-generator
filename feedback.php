<?php
/**
 * Sundial Generator Feedback
 *
 * Accepts user feedback via POST and sends it directly by email.
 * Uses the same SMTP configuration as export-logger.php (email-config.php / env vars).
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

if (file_exists(__DIR__ . '/email-config.php')) {
    require_once __DIR__ . '/email-config.php';
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} elseif (file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/src/SMTP.php';
} else {
    $phpmailerPaths = [
        '/home/' . get_current_user() . '/PHPMailer',
        '/home/' . get_current_user() . '/public_html/PHPMailer',
        __DIR__ . '/../PHPMailer',
        '/usr/share/php/PHPMailer',
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
        echo json_encode([
            'success' => false,
            'error' => 'PHPMailer library not found.',
        ]);
        exit;
    }
}

function getClientIpAddress(): string {
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ipAddress = trim($parts[0]);
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ipAddress = $_SERVER['HTTP_CLIENT_IP'];
    }
    return $ipAddress;
}

function isPublicIp(string $ip): bool {
    return filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) !== false;
}

function getApproximateLocationFromCoordinates(?float $lat, ?float $lon): ?string {
    if ($lat === null || $lon === null) {
        return null;
    }

    $url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lon&zoom=10&addressdetails=1";
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: SundialGenerator/1.0 (contact: sundial@gennetten.com)',
            ],
            'timeout' => 5,
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (!$data || !isset($data['address'])) {
        return null;
    }

    $address = $data['address'];
    $parts = [];

    if (isset($address['city'])) {
        $parts[] = $address['city'];
    } elseif (isset($address['town'])) {
        $parts[] = $address['town'];
    } elseif (isset($address['village'])) {
        $parts[] = $address['village'];
    }

    if (isset($address['state'])) {
        $parts[] = $address['state'];
    } elseif (isset($address['region'])) {
        $parts[] = $address['region'];
    }

    if (isset($address['country'])) {
        $parts[] = $address['country'];
    }

    if (!empty($parts)) {
        return implode(', ', $parts);
    }

    return $data['display_name'] ?? null;
}

function getApproximateLocationFromIp(string $ip): ?string {
    if (!isPublicIp($ip)) {
        return null;
    }

    $url = 'http://ip-api.com/json/' . urlencode($ip) . '?fields=status,city,regionName,country,lat,lon';
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 5,
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (!$data || ($data['status'] ?? '') !== 'success') {
        return null;
    }

    $parts = array_filter([
        $data['city'] ?? null,
        $data['regionName'] ?? null,
        $data['country'] ?? null,
    ]);

    return !empty($parts) ? implode(', ', $parts) : null;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = [];
}

$message = trim($data['message'] ?? '');
if ($message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Feedback message is required.']);
    exit;
}

if (mb_strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Feedback message is too long.']);
    exit;
}

$locationName = trim($data['locationName'] ?? 'Unknown');
$latitude = isset($data['latitude']) && is_numeric($data['latitude']) ? floatval($data['latitude']) : null;
$longitude = isset($data['longitude']) && is_numeric($data['longitude']) ? floatval($data['longitude']) : null;

$ipAddress = getClientIpAddress();
$date = date('Y-m-d');
$time = date('H:i:s');

$locationFromCoordinates = getApproximateLocationFromCoordinates($latitude, $longitude);
$locationFromIp = getApproximateLocationFromIp($ipAddress);

$emailBody = "Sundial Generator Feedback\n\n";
$emailBody .= "Date: $date\n";
$emailBody .= "Time: $time\n";
$emailBody .= "IP Address: $ipAddress\n\n";

$emailBody .= "Estimated sender location:\n";
$emailBody .= "Dial location name: $locationName\n";
if ($latitude !== null && $longitude !== null) {
    $emailBody .= "Dial coordinates: $latitude, $longitude\n";
}
if ($locationFromCoordinates !== null) {
    $emailBody .= "Reverse geocoded (from dial coordinates): $locationFromCoordinates\n";
}
if ($locationFromIp !== null) {
    $emailBody .= "IP geolocation estimate: $locationFromIp\n";
}

$emailBody .= "\nFeedback:\n";
$emailBody .= str_repeat('-', 50) . "\n";
$emailBody .= $message . "\n";
$emailBody .= str_repeat('-', 50) . "\n";

$mail = new PHPMailer(true);
$emailSent = false;
$emailError = '';

try {
    $smtpHost = trim($_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?? 'smtp.dreamhost.com');
    $smtpUsername = trim($_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME') ?? 'info@precisionsundial.com');
    $smtpPassword = trim($_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD') ?? '');
    $smtpFromEmail = trim($_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?? 'info@precisionsundial.com');
    $notificationEmail = trim($_ENV['NOTIFICATION_EMAIL'] ?? getenv('NOTIFICATION_EMAIL') ?? 'douglas@gennetten.com');

    if (empty($smtpFromEmail)) {
        $smtpFromEmail = 'info@precisionsundial.com';
    }
    if (empty($notificationEmail)) {
        $notificationEmail = 'douglas@gennetten.com';
    }

    if (empty($smtpPassword)) {
        $emailError = 'SMTP password not configured.';
    } else {
        $mail->SMTPDebug = 0;
        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->SMTPAuth = true;
        $mail->AuthType = 'PLAIN';
        $mail->Username = $smtpUsername;
        $mail->Password = trim($smtpPassword);
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;

        if (strpos($smtpHost, 'dreamhost') !== false) {
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true,
                ],
            ];
        }

        $mail->setFrom($smtpFromEmail, 'Sundial Generator');
        $mail->addAddress($notificationEmail);
        $mail->addReplyTo($smtpFromEmail, 'Sundial Generator');

        $mail->isHTML(false);
        $mail->Subject = 'Sundial Generator Feedback';
        $mail->Body = $emailBody;

        $mail->send();
        $emailSent = true;
    }
} catch (Exception $e) {
    $emailError = (isset($mail) ? $mail->ErrorInfo : '') . ' | Exception: ' . $e->getMessage();
}

if (!$emailSent) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $emailError ?: 'Failed to send feedback email.',
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'emailSent' => true,
    'timestamp' => "$date $time",
]);
