<?php
/**
 * Sundial Generator Feedback
 *
 * Accepts user feedback via POST and emails the site owner.
 * Optional structured fields: source, rating, email (Reply-To), format, event.
 * Event-only posts (nudge_shown) are logged and do not send mail.
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

require_once __DIR__ . '/feedback-config.php';

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
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
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

$allowedSources = ['export-nudge', 'about', 'followup'];
$allowedRatings = ['worked', 'problem'];
$allowedEvents = ['nudge_shown', 'nudge_rated', 'nudge_commented', 'followup_opted_in'];

$message = trim((string) ($data['message'] ?? ''));
$source = trim((string) ($data['source'] ?? ''));
$rating = trim((string) ($data['rating'] ?? ''));
$event = trim((string) ($data['event'] ?? ''));
$email = strtolower(trim((string) ($data['email'] ?? '')));
$format = trim((string) ($data['format'] ?? ''));
$followUp = !empty($data['followUp']);

if ($source !== '' && !in_array($source, $allowedSources, true)) {
    $source = '';
}
if ($rating !== '' && !in_array($rating, $allowedRatings, true)) {
    $rating = '';
}
if ($event !== '' && !in_array($event, $allowedEvents, true)) {
    $event = '';
}
if ($email !== '' && !feedback_valid_email($email)) {
    $email = '';
}
if (mb_strlen($format) > 20) {
    $format = substr($format, 0, 20);
}

if (mb_strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Feedback message is too long.']);
    exit;
}

$locationName = trim((string) ($data['locationName'] ?? 'Unknown'));
$latitude = isset($data['latitude']) && is_numeric($data['latitude']) ? floatval($data['latitude']) : null;
$longitude = isset($data['longitude']) && is_numeric($data['longitude']) ? floatval($data['longitude']) : null;
$ipAddress = gallery_client_ip();

feedback_log_event($event !== '' ? $event : 'feedback', [
    'source' => $source,
    'rating' => $rating,
    'format' => $format,
    'location' => $locationName,
    'email' => $email !== '' ? 'yes' : '',
    'commented' => $message !== '' ? 'yes' : '',
    'followUp' => $followUp ? 'yes' : '',
    'ip' => $ipAddress,
]);

if ($event === 'nudge_shown' && $message === '' && $rating === '') {
    echo json_encode(['success' => true, 'logged' => true]);
    exit;
}

if ($message === '' && $rating === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Feedback message or rating is required.']);
    exit;
}

$date = date('Y-m-d');
$time = date('H:i:s');
$locationFromCoordinates = getApproximateLocationFromCoordinates($latitude, $longitude);
$locationFromIp = getApproximateLocationFromIp($ipAddress);

$emailBody = "Sundial Generator Feedback\n\n";
$emailBody .= "Date: $date\n";
$emailBody .= "Time: $time\n";
$emailBody .= "IP Address: $ipAddress\n";
if ($source !== '') {
    $emailBody .= "Source: $source\n";
}
if ($event !== '') {
    $emailBody .= "Event: $event\n";
}
if ($rating !== '') {
    $emailBody .= "Rating: $rating\n";
}
if ($format !== '') {
    $emailBody .= "Format: $format\n";
}
if ($email !== '') {
    $emailBody .= "Reply email: $email\n";
}
$emailBody .= 'Follow-up requested: ' . ($followUp ? 'yes' : 'no') . "\n\n";

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
$emailBody .= ($message !== '' ? $message : '(no comment)') . "\n";
$emailBody .= str_repeat('-', 50) . "\n";

$ratingLabel = $rating !== '' ? $rating : 'note';
$sourceLabel = $source !== '' ? $source : 'feedback';
$subjectLocation = $locationName !== '' ? $locationName : 'Unknown';
$subject = "Feedback [$ratingLabel] $subjectLocation";
if ($sourceLabel !== 'export-nudge') {
    $subject = "Feedback [$ratingLabel/$sourceLabel] $subjectLocation";
}

$emailSent = feedback_send_owner_mail($subject, $emailBody, $email !== '' ? $email : null);

if (!$emailSent) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to send feedback email.',
    ]);
    exit;
}

if ($followUp && $email !== '') {
    feedback_queue_followup([
        'email' => $email,
        'rating' => $rating !== '' ? $rating : null,
        'comment' => $message !== '' ? $message : null,
        'location_name' => $locationName,
        'format' => $format !== '' ? $format : null,
        'latitude' => $latitude,
        'longitude' => $longitude,
    ]);
}

echo json_encode([
    'success' => true,
    'emailSent' => true,
    'timestamp' => "$date $time",
]);
