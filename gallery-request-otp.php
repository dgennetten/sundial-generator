<?php
/**
 * POST { email } → { success: true }
 *
 * Mails a 6-digit sign-in code to any valid address. Unlike the portfolio's
 * admin-only flow there is no allowlist, so this endpoint is throttled per
 * email and per IP to keep it from being used as a mail relay.
 *
 * Always responds 200 regardless of throttling — never leak whether an address
 * is known or rate-limited.
 */

require_once __DIR__ . '/gallery-config.php';
gallery_cors('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gallery_error('Method not allowed', 405);
}

$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$email = strtolower(trim((string) ($body['email'] ?? '')));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
    gallery_json(['success' => true]);
}

$db = gallery_db();
$ip = gallery_client_ip();

try {
    // Throttle: 3 codes per email per 10 minutes, 10 per IP per hour.
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM gallery_otp_codes WHERE email = ? AND created_at > (NOW() - INTERVAL 10 MINUTE)'
    );
    $stmt->execute([$email]);
    if ((int) $stmt->fetchColumn() >= 3) {
        gallery_json(['success' => true]);
    }

    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM gallery_otp_codes WHERE request_ip = ? AND created_at > (NOW() - INTERVAL 1 HOUR)'
    );
    $stmt->execute([$ip]);
    if ((int) $stmt->fetchColumn() >= 10) {
        gallery_json(['success' => true]);
    }

    $code      = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+' . GALLERY_OTP_TTL_MINUTES . ' minutes'));

    $db->beginTransaction();
    $db->prepare('UPDATE gallery_otp_codes SET used = 1 WHERE email = ? AND used = 0')->execute([$email]);
    $db->prepare('INSERT INTO gallery_otp_codes (email, code, request_ip, expires_at) VALUES (?, ?, ?, ?)')
       ->execute([$email, $code, $ip, $expiresAt]);
    $db->commit();
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log('gallery request-otp error: ' . $e->getMessage());
    gallery_json(['success' => true]);
}

$subject = 'Your Sundial Gallery sign-in code';
$message = "Your one-time sign-in code is:\n\n    {$code}\n\n"
         . 'It expires in ' . GALLERY_OTP_TTL_MINUTES . " minutes.\n\n"
         . "If you didn't request this, you can ignore this email.\n";

gallery_send_mail($email, $subject, $message);

gallery_json(['success' => true]);
