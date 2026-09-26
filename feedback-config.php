<?php
/**
 * Shared helpers for in-app feedback and the delayed follow-up email.
 *
 * Reuses gallery-config.php for DB + SMTP so credentials stay in one place
 * (db-config.php / email-config.php).
 */

require_once __DIR__ . '/gallery-config.php';

define('FEEDBACK_FOLLOWUP_DAYS', 5);
define('FEEDBACK_PUBLIC_URL', GALLERY_PUBLIC_URL);
define('FEEDBACK_OPTIN_MAX_EMAIL_PER_HOUR', 3);
define('FEEDBACK_OPTIN_MAX_IP_PER_HOUR', 10);

function feedback_notification_email(): string {
    $email = trim($_ENV['NOTIFICATION_EMAIL'] ?? getenv('NOTIFICATION_EMAIL') ?: 'douglas@gennetten.com');
    return $email !== '' ? $email : 'douglas@gennetten.com';
}

function feedback_log_event(string $event, array $fields = []): void {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $parts = [date('c'), $event];
    foreach ($fields as $key => $value) {
        if ($value === null || $value === '') {
            continue;
        }
        $safe = str_replace([';', "\n", "\r"], [',', ' ', ' '], (string) $value);
        $parts[] = $key . '=' . $safe;
    }
    @file_put_contents($logDir . '/feedback.log', implode(';', $parts) . "\n", FILE_APPEND | LOCK_EX);
}

function feedback_ensure_schema(PDO $db): void {
    $db->exec(
        'CREATE TABLE IF NOT EXISTS feedback_followups (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL,
            token CHAR(64) NOT NULL,
            unsubscribe_token CHAR(64) NOT NULL,
            send_after DATETIME NOT NULL,
            sent_at DATETIME NULL DEFAULT NULL,
            responded_at DATETIME NULL DEFAULT NULL,
            unsubscribed_at DATETIME NULL DEFAULT NULL,
            rating VARCHAR(20) DEFAULT NULL,
            comment TEXT DEFAULT NULL,
            location_name VARCHAR(255) DEFAULT NULL,
            export_format VARCHAR(20) DEFAULT NULL,
            latitude DECIMAL(10, 7) NULL DEFAULT NULL,
            longitude DECIMAL(10, 7) NULL DEFAULT NULL,
            request_ip VARCHAR(45) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_followup_token (token),
            UNIQUE KEY uniq_followup_unsub (unsubscribe_token),
            KEY idx_followup_pending (sent_at, unsubscribed_at, send_after),
            KEY idx_followup_email (email, sent_at, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function feedback_random_token(): string {
    return bin2hex(random_bytes(32));
}

function feedback_valid_email(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false && strlen($email) <= 255;
}

function feedback_send_owner_mail(string $subject, string $body, ?string $replyTo = null): bool {
    $to = feedback_notification_email();
    $from = trim($_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?: 'info@precisionsundial.com');
    if (!gallery_load_phpmailer()) {
        return false;
    }

    $host     = trim($_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: 'smtp.dreamhost.com');
    $username = trim($_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME') ?: 'info@precisionsundial.com');
    $password = trim($_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD') ?: '');
    if ($password === '') {
        error_log('feedback: SMTP_PASSWORD not configured');
        return false;
    }

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->SMTPDebug = 0;
        $mail->isSMTP();
        $mail->Host       = $host;
        $mail->SMTPAuth   = true;
        $mail->AuthType   = 'PLAIN';
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

        $mail->setFrom($from !== '' ? $from : 'info@precisionsundial.com', 'Sundial Generator');
        $mail->addAddress($to);
        if ($replyTo && feedback_valid_email($replyTo)) {
            $mail->addReplyTo($replyTo);
        } else {
            $mail->addReplyTo($from !== '' ? $from : 'info@precisionsundial.com', 'Sundial Generator');
        }
        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('feedback: owner mail failed: ' . $mail->ErrorInfo . ' | ' . $e->getMessage());
        return false;
    }
}

function feedback_send_user_mail(string $to, string $subject, string $htmlBody): bool {
    if (!gallery_load_phpmailer() || !feedback_valid_email($to)) {
        return false;
    }

    $host     = trim($_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: 'smtp.dreamhost.com');
    $username = trim($_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME') ?: 'info@precisionsundial.com');
    $password = trim($_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD') ?: '');
    $from     = trim($_ENV['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?: 'info@precisionsundial.com');
    if ($password === '') {
        error_log('feedback: SMTP_PASSWORD not configured');
        return false;
    }

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->SMTPDebug = 0;
        $mail->isSMTP();
        $mail->Host       = $host;
        $mail->SMTPAuth   = true;
        $mail->AuthType   = 'PLAIN';
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

        $mail->setFrom($from !== '' ? $from : 'info@precisionsundial.com', 'Sundial Generator');
        $mail->addAddress($to);
        $mail->addReplyTo(feedback_notification_email(), 'Douglas Gennetten');
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlBody) ?? $htmlBody);
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('feedback: user mail failed: ' . $mail->ErrorInfo . ' | ' . $e->getMessage());
        return false;
    }
}

/**
 * Queue at most one unsent follow-up per email. Returns true if a row is
 * already pending or was just inserted. Throttles like gallery OTP.
 */
function feedback_queue_followup(array $payload): bool {
    $email = strtolower(trim((string) ($payload['email'] ?? '')));
    if (!feedback_valid_email($email)) {
        return false;
    }

    try {
        $db = gallery_db();
        feedback_ensure_schema($db);
        $ip = gallery_client_ip();

        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM feedback_followups WHERE email = ? AND created_at > (NOW() - INTERVAL 1 HOUR)'
        );
        $stmt->execute([$email]);
        if ((int) $stmt->fetchColumn() >= FEEDBACK_OPTIN_MAX_EMAIL_PER_HOUR) {
            return false;
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM feedback_followups WHERE request_ip = ? AND created_at > (NOW() - INTERVAL 1 HOUR)'
        );
        $stmt->execute([$ip]);
        if ((int) $stmt->fetchColumn() >= FEEDBACK_OPTIN_MAX_IP_PER_HOUR) {
            return false;
        }

        $stmt = $db->prepare(
            'SELECT id FROM feedback_followups
             WHERE email = ? AND sent_at IS NULL AND unsubscribed_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            return true;
        }

        $stmt = $db->prepare(
            'SELECT id FROM feedback_followups WHERE email = ? AND sent_at IS NOT NULL LIMIT 1'
        );
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            return true;
        }

        $sendAfter = date('Y-m-d H:i:s', strtotime('+' . FEEDBACK_FOLLOWUP_DAYS . ' days'));
        $db->prepare(
            'INSERT INTO feedback_followups
                (email, token, unsubscribe_token, send_after, rating, comment, location_name,
                 export_format, latitude, longitude, request_ip)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $email,
            feedback_random_token(),
            feedback_random_token(),
            $sendAfter,
            $payload['rating'] ?? null,
            $payload['comment'] ?? null,
            $payload['location_name'] ?? null,
            $payload['format'] ?? null,
            isset($payload['latitude']) && is_numeric($payload['latitude']) ? $payload['latitude'] : null,
            isset($payload['longitude']) && is_numeric($payload['longitude']) ? $payload['longitude'] : null,
            $ip,
        ]);
        return true;
    } catch (Exception $e) {
        error_log('feedback queue followup failed: ' . $e->getMessage());
        return false;
    }
}
