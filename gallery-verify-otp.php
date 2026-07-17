<?php
/**
 * POST { email, code, remember } → { success, token, email, id, expiresAt }
 *
 * Verifies the code and issues a session token. The gallery_users row is
 * created on first successful verify — any address can become a user.
 */

require_once __DIR__ . '/gallery-config.php';
gallery_cors('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gallery_error('Method not allowed', 405);
}

$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$email = strtolower(trim((string) ($body['email'] ?? '')));
$code  = trim((string) ($body['code'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^\d{6}$/', $code)) {
    gallery_error('Invalid or expired code', 401);
}

$db = gallery_db();

// Newest live code for this address, whether or not it matches what was typed.
$stmt = $db->prepare(
    'SELECT id, code, attempts FROM gallery_otp_codes
     WHERE email = ? AND used = 0 AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1'
);
$stmt->execute([$email]);
$otp = $stmt->fetch();

if (!$otp) {
    gallery_error('Invalid or expired code', 401);
}

if ((int) $otp['attempts'] >= GALLERY_OTP_MAX_ATTEMPTS) {
    $db->prepare('UPDATE gallery_otp_codes SET used = 1 WHERE id = ?')->execute([$otp['id']]);
    gallery_error('Too many attempts. Request a new code.', 429);
}

if (!hash_equals((string) $otp['code'], $code)) {
    $db->prepare('UPDATE gallery_otp_codes SET attempts = attempts + 1 WHERE id = ?')->execute([$otp['id']]);
    gallery_error('Invalid or expired code', 401);
}

$db->prepare('UPDATE gallery_otp_codes SET used = 1 WHERE id = ?')->execute([$otp['id']]);

// Upsert the user, then read back the id (lastInsertId is unreliable on the
// no-op branch of ON DUPLICATE KEY UPDATE).
$db->prepare(
    'INSERT INTO gallery_users (email, last_login_at) VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE last_login_at = NOW()'
)->execute([$email]);

$stmt = $db->prepare('SELECT id, is_blocked FROM gallery_users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    gallery_error('Could not create account', 500);
}
if ((int) $user['is_blocked'] === 1) {
    gallery_error('This account has been blocked.', 403);
}

$remember  = !empty($body['remember']);
$token     = bin2hex(random_bytes(32));
$days      = $remember ? GALLERY_SESSION_DAYS_REMEMBER : GALLERY_SESSION_DAYS_DEFAULT;
$expiresAt = date('Y-m-d H:i:s', strtotime("+$days days"));

$db->prepare('INSERT INTO gallery_sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
   ->execute([(int) $user['id'], $token, $expiresAt]);

// Opportunistic cleanup of spent codes and dead sessions.
if (random_int(1, 20) === 1) {
    $db->exec('DELETE FROM gallery_otp_codes WHERE expires_at < NOW() OR used = 1');
    $db->exec('DELETE FROM gallery_sessions WHERE expires_at < NOW()');
}

gallery_json([
    'success'   => true,
    'token'     => $token,
    'email'     => $email,
    'id'        => (int) $user['id'],
    'expiresAt' => strtotime($expiresAt) * 1000,
]);
