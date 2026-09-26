<?php
/**
 * POST { email, locationName, rating, comment, format, latitude, longitude }
 * → { success: true }
 *
 * Queues a single day-5 follow-up. Always returns success for valid-looking
 * requests so the client cannot probe throttle or prior opt-ins.
 */

require_once __DIR__ . '/feedback-config.php';
gallery_cors('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gallery_error('Method not allowed', 405);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    $body = [];
}

$email = strtolower(trim((string) ($body['email'] ?? '')));
if (!feedback_valid_email($email)) {
    gallery_json(['success' => true]);
}

$rating = trim((string) ($body['rating'] ?? ''));
if ($rating !== '' && !in_array($rating, ['worked', 'problem'], true)) {
    $rating = '';
}

feedback_queue_followup([
    'email' => $email,
    'rating' => $rating !== '' ? $rating : null,
    'comment' => trim((string) ($body['comment'] ?? '')),
    'location_name' => trim((string) ($body['locationName'] ?? '')),
    'format' => trim((string) ($body['format'] ?? '')),
    'latitude' => $body['latitude'] ?? null,
    'longitude' => $body['longitude'] ?? null,
]);

feedback_log_event('followup_opted_in', [
    'email' => 'yes',
    'location' => trim((string) ($body['locationName'] ?? '')),
    'format' => trim((string) ($body['format'] ?? '')),
]);

gallery_json(['success' => true]);
