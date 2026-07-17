<?php
/**
 * POST { token } → { success, token, email, id, expiresAt }
 *
 * Revalidates a stored token on page load so a remembered device stays signed in.
 */

require_once __DIR__ . '/gallery-config.php';
require_once __DIR__ . '/gallery-auth.php';

gallery_cors('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gallery_error('Method not allowed', 405);
}

$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$token = trim((string) ($body['token'] ?? ''));

if (!gallery_valid_token_format($token)) {
    gallery_error('Invalid token', 401);
}

$db   = gallery_db();
$stmt = $db->prepare(
    'SELECT s.expires_at, u.id, u.email, u.is_blocked
     FROM gallery_sessions s
     JOIN gallery_users u ON u.id = s.user_id
     WHERE s.token = ? LIMIT 1'
);
$stmt->execute([$token]);
$row = $stmt->fetch();

if (!$row || (int) $row['is_blocked'] === 1) {
    gallery_error('Unknown session', 401);
}

$expiresTs = strtotime($row['expires_at']);
if (!$expiresTs || $expiresTs < time()) {
    $db->prepare('DELETE FROM gallery_sessions WHERE token = ?')->execute([$token]);
    gallery_error('Session expired', 401);
}

gallery_json([
    'success'   => true,
    'token'     => $token,
    'email'     => $row['email'],
    'id'        => (int) $row['id'],
    'expiresAt' => $expiresTs * 1000,
]);
