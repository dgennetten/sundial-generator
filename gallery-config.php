<?php
/**
 * Sundial Photo Gallery — shared configuration and helpers.
 *
 * Credentials come from the same gitignored files the rest of the app uses:
 *   db-config.php    → DB_HOST / DB_USER / DB_PASS / DB_NAME
 *   email-config.php → SMTP_HOST / SMTP_USERNAME / SMTP_PASSWORD / SMTP_FROM_EMAIL
 *
 * require_once this file at the top of every gallery-*.php endpoint.
 */

if (file_exists(__DIR__ . '/db-config.php')) {
    require_once __DIR__ . '/db-config.php';
}
if (file_exists(__DIR__ . '/email-config.php')) {
    require_once __DIR__ . '/email-config.php';
}

define('GALLERY_OTP_TTL_MINUTES', 10);
define('GALLERY_OTP_MAX_ATTEMPTS', 5);
define('GALLERY_SESSION_DAYS_REMEMBER', 365);
define('GALLERY_SESSION_DAYS_DEFAULT', 1);
define('GALLERY_MODERATOR_EMAIL', trim($_ENV['GALLERY_MODERATOR_EMAIL'] ?? getenv('GALLERY_MODERATOR_EMAIL') ?: 'douglas@gennetten.com'));
define('GALLERY_PUBLIC_URL', rtrim(trim($_ENV['GALLERY_PUBLIC_URL'] ?? getenv('GALLERY_PUBLIC_URL') ?: 'https://precisionsundial.com'), '/'));
define('GALLERY_UPLOAD_DIR', __DIR__ . '/gallery-uploads');
define('GALLERY_UPLOAD_URL_PATH', '/gallery-uploads');
define('GALLERY_MAX_UPLOAD_BYTES', 12 * 1024 * 1024); // 12 MB
define('GALLERY_MAX_DIMENSION', 2000);                // longest edge, px
define('GALLERY_MAX_PENDING_PER_USER', 5);
define('GALLERY_CAPTION_MAX_LENGTH', 500);

function gallery_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = trim($_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'mysql.precisionsundial.com');
    $user = trim($_ENV['DB_USER'] ?? getenv('DB_USER') ?: '');
    $pass = trim($_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: '');
    $name = trim($_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'sundials');

    if ($user === '' || $pass === '') {
        gallery_error('Database credentials not configured', 500);
    }

    $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

/**
 * Tokens travel in the Authorization header rather than cookies, so a wildcard
 * origin is safe here and matches sundial-prints-api.php.
 */
function gallery_cors(string $methods = 'GET, POST, OPTIONS'): void {
    header('Access-Control-Allow-Origin: *');
    header("Access-Control-Allow-Methods: $methods");
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** @param mixed $data */
function gallery_json($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($data);
    exit;
}

function gallery_error(string $message, int $status = 400): void {
    gallery_json(['success' => false, 'error' => $message], $status);
}

function gallery_client_ip(): string {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    }
    return $_SERVER['HTTP_CLIENT_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/**
 * Locates PHPMailer using the same search paths as export-logger.php.
 */
function gallery_load_phpmailer(): bool {
    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        return true;
    }
    if (file_exists(__DIR__ . '/vendor/autoload.php')) {
        require_once __DIR__ . '/vendor/autoload.php';
        return class_exists('PHPMailer\\PHPMailer\\PHPMailer');
    }
    $candidates = [
        __DIR__ . '/PHPMailer',
        '/home/' . get_current_user() . '/PHPMailer',
        '/home/' . get_current_user() . '/public_html/PHPMailer',
        __DIR__ . '/../PHPMailer',
        '/usr/share/php/PHPMailer',
    ];
    foreach ($candidates as $base) {
        if (file_exists($base . '/src/PHPMailer.php')) {
            require_once $base . '/src/Exception.php';
            require_once $base . '/src/PHPMailer.php';
            require_once $base . '/src/SMTP.php';
            return true;
        }
    }
    error_log('gallery: PHPMailer not found in any known location');
    return false;
}

/**
 * Sends mail via the configured SMTP relay. Returns false (and logs) on failure
 * so callers can decide whether the failure is fatal.
 *
 * @param string[] $attachments Absolute paths to attach.
 */
function gallery_send_mail(string $to, string $subject, string $body, bool $isHtml = false, array $attachments = []): bool {
    if (!gallery_load_phpmailer()) {
        return false;
    }

    $host     = trim($_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: 'smtp.dreamhost.com');
    $username = trim($_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME') ?: 'info@precisionsundial.com');
    $password = trim($_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD') ?: '');
    $from     = trim($_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?: 'info@precisionsundial.com');

    if ($password === '') {
        error_log('gallery: SMTP_PASSWORD not configured; skipping mail to ' . $to);
        return false;
    }

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->SMTPDebug = 0;
        $mail->isSMTP();
        $mail->Host       = $host;
        $mail->SMTPAuth   = true;
        $mail->AuthType   = 'PLAIN'; // more reliable with Dreamhost
        $mail->Username   = $username;
        $mail->Password   = $password;
        $mail->SMTPSecure = 'tls';
        $mail->Port       = 587;
        $mail->CharSet    = 'UTF-8';

        if (strpos($host, 'dreamhost') !== false) {
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ],
            ];
        }

        $mail->setFrom($from, 'Sundial Generator');
        $mail->addAddress($to);
        $mail->addReplyTo($from, 'Sundial Generator');
        $mail->isHTML($isHtml);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        if ($isHtml) {
            $mail->AltBody = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $body));
        }
        foreach ($attachments as $path) {
            if (is_readable($path)) {
                $mail->addAttachment($path);
            }
        }
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('gallery: mail to ' . $to . ' failed: ' . $mail->ErrorInfo . ' | ' . $e->getMessage());
        return false;
    }
}
