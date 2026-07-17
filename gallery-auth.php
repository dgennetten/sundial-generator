<?php
/**
 * Gallery auth middleware — validates the Bearer token against gallery_sessions.
 *
 * Usage:
 *   require_once __DIR__ . '/gallery-auth.php';
 *   $user = gallery_require_user();   // ['id' => .., 'email' => ..]
 */

require_once __DIR__ . '/gallery-config.php';

function gallery_bearer_token(): ?string {
    $header = '';
    if (function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $header = $value;
                break;
            }
        }
    }
    if ($header === '') {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    }
    if (preg_match('/^Bearer\s+(.+)$/i', trim($header), $m)) {
        return trim($m[1]);
    }
    return null;
}

function gallery_valid_token_format(?string $token): bool {
    return is_string($token) && strlen($token) === 64 && ctype_xdigit($token);
}

/**
 * Resolves the signed-in user, or exits 401. Blocked users are rejected.
 *
 * @return array{id:int,email:string}
 */
function gallery_require_user(): array {
    $token = gallery_bearer_token();
    if (!gallery_valid_token_format($token)) {
        gallery_error('Unauthorized', 401);
    }

    $stmt = gallery_db()->prepare(
        'SELECT u.id, u.email
         FROM gallery_sessions s
         JOIN gallery_users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.is_blocked = 0
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        gallery_error('Unauthorized', 401);
    }

    return ['id' => (int) $user['id'], 'email' => $user['email']];
}
