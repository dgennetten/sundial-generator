<?php
/**
 * Sundial Prints API
 * MySQL-backed endpoint for logging and retrieving sundial print/export records.
 *
 * GET  /sundial-prints-api.php[?limit=N][&worldTour=1] → { prints: [...], totalCount: n }
 * POST /sundial-prints-api.php  + JSON            → { success: true }  (insert)
 * POST /sundial-prints-api.php  + { action:delete, id, password } → { success: true }
 *
 * Credentials are read from db-config.php (gitignored) or environment variables.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

/** Shared with the client Admin panel — required for delete. */
define('SUNDIAL_ADMIN_PASSWORD', '752192');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load credentials from db-config.php if present
if (file_exists(__DIR__ . '/db-config.php')) {
    require_once __DIR__ . '/db-config.php';
}

$host = trim($_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'mysql.precisionsundial.com');
$user = trim($_ENV['DB_USER'] ?? getenv('DB_USER') ?? '');
$pass = trim($_ENV['DB_PASS'] ?? getenv('DB_PASS') ?? '');
$name = trim($_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'sundials');

if (empty($user) || empty($pass)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database credentials not configured']);
    exit;
}

$pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

// Idempotent migration: legacy rows remain tour-eligible via DEFAULT 0.
$worldTourColumn = $pdo->query("SHOW COLUMNS FROM sundial_prints LIKE 'exclude_from_world_tour'");
if (!$worldTourColumn->fetch()) {
    try {
        $pdo->exec(
            'ALTER TABLE sundial_prints
             ADD COLUMN exclude_from_world_tour TINYINT(1) NOT NULL DEFAULT 0
             AFTER today_line_active'
        );
    } catch (Throwable $e) {
        // A concurrent first request may have added it after our SHOW query.
        $checkAgain = $pdo->query("SHOW COLUMNS FROM sundial_prints LIKE 'exclude_from_world_tour'");
        if (!$checkAgain->fetch()) {
            throw $e;
        }
    }
}

/**
 * Notify the site owner when a published dial is excluded from the World Tour.
 * Best-effort: any failure is swallowed and never affects the insert response.
 * SMTP setup mirrors export-logger.php (credentials from email-config.php / $_ENV).
 *
 * @param string $body Plain-text email body with the dial details.
 * @return array{emailSent: bool, emailError: string}
 */
function sendDialExcludedEmail(string $body): array
{
    $result = ['emailSent' => false, 'emailError' => ''];

    try {
        // Credentials live only on the server (gitignored email-config.php sets $_ENV).
        if (file_exists(__DIR__ . '/email-config.php')) {
            require_once __DIR__ . '/email-config.php';
        }

        // Load PHPMailer from the usual hosting locations (same list as export-logger.php).
        if (!class_exists('\\PHPMailer\\PHPMailer\\PHPMailer')) {
            if (file_exists(__DIR__ . '/vendor/autoload.php')) {
                require_once __DIR__ . '/vendor/autoload.php';
            } elseif (file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php')) {
                require_once __DIR__ . '/PHPMailer/src/Exception.php';
                require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
                require_once __DIR__ . '/PHPMailer/src/SMTP.php';
            } else {
                foreach ([
                    '/home/' . get_current_user() . '/PHPMailer',
                    '/home/' . get_current_user() . '/public_html/PHPMailer',
                    __DIR__ . '/../PHPMailer',
                    '/usr/share/php/PHPMailer',
                ] as $basePath) {
                    if (file_exists($basePath . '/src/PHPMailer.php')) {
                        require_once $basePath . '/src/Exception.php';
                        require_once $basePath . '/src/PHPMailer.php';
                        require_once $basePath . '/src/SMTP.php';
                        break;
                    }
                }
            }
        }

        if (!class_exists('\\PHPMailer\\PHPMailer\\PHPMailer')) {
            $result['emailError'] = 'PHPMailer library not found';
            return $result;
        }

        $smtpHost          = trim($_ENV['SMTP_HOST']          ?? getenv('SMTP_HOST')          ?? 'smtp.dreamhost.com');
        $smtpUsername      = trim($_ENV['SMTP_USERNAME']      ?? getenv('SMTP_USERNAME')      ?? 'info@precisionsundial.com');
        $smtpPassword      = trim($_ENV['SMTP_PASSWORD']      ?? getenv('SMTP_PASSWORD')      ?? '');
        $smtpFromEmail     = trim($_ENV['SMTP_FROM_EMAIL']    ?? getenv('SMTP_FROM_EMAIL')    ?? 'info@precisionsundial.com');
        $notificationEmail = trim($_ENV['NOTIFICATION_EMAIL'] ?? getenv('NOTIFICATION_EMAIL') ?? 'douglas@gennetten.com');

        if ($smtpFromEmail === '') {
            $smtpFromEmail = 'info@precisionsundial.com';
        }
        if ($notificationEmail === '') {
            $notificationEmail = 'douglas@gennetten.com';
        }

        if ($smtpPassword === '') {
            $result['emailError'] = 'SMTP password not configured';
            return $result;
        }

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->SMTPDebug = 0;
        $mail->isSMTP();
        $mail->Host       = $smtpHost;
        $mail->SMTPAuth   = true;
        $mail->AuthType   = 'PLAIN'; // more reliable with Dreamhost
        $mail->Username   = $smtpUsername;
        $mail->Password   = $smtpPassword;
        $mail->SMTPSecure = 'tls';
        $mail->Port       = 587;

        if (strpos($smtpHost, 'dreamhost') !== false) {
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ],
            ];
        }

        $mail->setFrom($smtpFromEmail, 'Sundial Generator');
        $mail->addAddress($notificationEmail);
        $mail->addReplyTo($smtpFromEmail, 'Sundial Generator');
        $mail->isHTML(false);
        $mail->Subject = 'DIAL EXCLUDED';
        $mail->Body    = $body;
        $mail->send();

        $result['emailSent'] = true;
    } catch (\Throwable $e) {
        $result['emailError'] = $e->getMessage();
    }

    return $result;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $worldTourOnly = isset($_GET['worldTour']) && $_GET['worldTour'] === '1';
    $whereClause = $worldTourOnly ? ' WHERE exclude_from_world_tour = 0' : '';

    $countStmt = $pdo->query('SELECT COUNT(*) FROM sundial_prints' . $whereClause);
    $totalCount = (int) $countStmt->fetchColumn();

    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 200;
    if ($limit < 1) {
        $limit = 1;
    }
    if ($limit > 1000) {
        $limit = 1000;
    }

    $stmt = $pdo->prepare(
        'SELECT id, location, latitude + 0 AS latitude, longitude + 0 AS longitude,
                inclination + 0 AS inclination, declination + 0 AS declination,
                gnomon_type, notes_type, date_range,
                COALESCE(today_line_active, 0) AS today_line_active,
                COALESCE(exclude_from_world_tour, 0) AS exclude_from_world_tour,
                config_json,
                created_at
         FROM sundial_prints
         ' . $whereClause . '
         ORDER BY created_at DESC
         LIMIT :lim'
    );
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    // Cast numeric columns to float
    foreach ($rows as &$row) {
        $row['latitude']          = (float) $row['latitude'];
        $row['longitude']         = (float) $row['longitude'];
        $row['inclination']       = (float) $row['inclination'];
        $row['declination']       = (float) $row['declination'];
        $row['id']                = (int)   $row['id'];
        $row['today_line_active'] = (bool)  $row['today_line_active'];
        $row['exclude_from_world_tour'] = (bool) $row['exclude_from_world_tour'];
    }
    unset($row);

    echo json_encode(['prints' => $rows, 'totalCount' => $totalCount, 'limit' => $limit]);
    exit;
}

if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
        exit;
    }

    // Admin delete: { action: "delete", id: N, password: "..." }
    if (($data['action'] ?? '') === 'delete') {
        $password = isset($data['password']) ? (string) $data['password'] : '';
        if (!hash_equals(SUNDIAL_ADMIN_PASSWORD, $password)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }
        $id = isset($data['id']) && is_numeric($data['id']) ? (int) $data['id'] : 0;
        if ($id < 1) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing or invalid id']);
            exit;
        }
        $del = $pdo->prepare('DELETE FROM sundial_prints WHERE id = :id');
        $del->execute([':id' => $id]);
        echo json_encode(['success' => true, 'deleted' => $del->rowCount()]);
        exit;
    }

    $latitude          = isset($data['latitude'])          && is_numeric($data['latitude'])    ? (float) $data['latitude']    : null;
    $longitude         = isset($data['longitude'])         && is_numeric($data['longitude'])   ? (float) $data['longitude']   : null;
    $inclination       = isset($data['inclination'])       && is_numeric($data['inclination']) ? (float) $data['inclination'] : null;
    $declination       = isset($data['declination'])       && is_numeric($data['declination']) ? (float) $data['declination'] : 0.0;
    $gnomon_type       = isset($data['gnomon_type'])       ? (string) $data['gnomon_type']     : null;
    $notes_type        = isset($data['notes_type'])        ? (string) $data['notes_type']      : null;
    $date_range        = isset($data['date_range'])        ? (string) $data['date_range']      : null;
    $location          = isset($data['location'])          ? (string) $data['location']        : null;
    $today_line_active = isset($data['today_line_active']) ? (int) (bool) $data['today_line_active'] : 0;
    $exclude_from_world_tour = isset($data['exclude_from_world_tour']) ? (int) (bool) $data['exclude_from_world_tour'] : 0;
    $config_json       = isset($data['config_json']) && is_string($data['config_json']) ? $data['config_json'] : null;

    if ($latitude === null || $longitude === null || $inclination === null ||
        $gnomon_type === null || $notes_type === null || $date_range === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO sundial_prints (location, latitude, longitude, inclination, declination, gnomon_type, notes_type, date_range, today_line_active, exclude_from_world_tour, config_json)
         VALUES (:location, :latitude, :longitude, :inclination, :declination, :gnomon_type, :notes_type, :date_range, :today_line_active, :exclude_from_world_tour, :config_json)'
    );
    $stmt->execute([
        ':location'          => $location,
        ':latitude'          => $latitude,
        ':longitude'         => $longitude,
        ':inclination'       => $inclination,
        ':declination'       => $declination,
        ':gnomon_type'       => $gnomon_type,
        ':notes_type'        => $notes_type,
        ':date_range'        => $date_range,
        ':today_line_active' => $today_line_active,
        ':exclude_from_world_tour' => $exclude_from_world_tour,
        ':config_json'       => $config_json,
    ]);

    $response = ['success' => true];

    // Someone excluded their published dial from the World Tour — email the owner
    // with the details. Best-effort; a mail failure never fails the insert.
    if ($exclude_from_world_tour === 1) {
        $newId = (int) $pdo->lastInsertId();
        $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['HTTP_CLIENT_IP']
            ?? $_SERVER['REMOTE_ADDR']
            ?? 'Unknown';
        $now = date('Y-m-d H:i:s');

        $body  = "A published dial was excluded from the World Tour.\n\n";
        $body .= "Dial ID: $newId\n";
        $body .= "Date/Time: $now\n";
        $body .= 'Location: ' . ($location !== null && $location !== '' ? $location : 'Unknown') . "\n";
        $body .= "Latitude: $latitude\n";
        $body .= "Longitude: $longitude\n";
        $body .= "Inclination: $inclination\n";
        $body .= "Declination: $declination\n";
        $body .= 'Gnomon Type: ' . ($gnomon_type ?? 'Unknown') . "\n";
        $body .= 'Notes Type: ' . ($notes_type ?? 'Unknown') . "\n";
        $body .= 'Date Range: ' . ($date_range ?? 'Unknown') . "\n";
        $body .= 'Today Line Active: ' . ($today_line_active ? 'Yes' : 'No') . "\n";
        $body .= "IP Address: $ipAddress\n";

        $mailResult = sendDialExcludedEmail($body);
        $response['excludedEmailSent'] = $mailResult['emailSent'];
        if (!$mailResult['emailSent'] && $mailResult['emailError'] !== '') {
            $response['excludedEmailError'] = $mailResult['emailError'];
        }
    }

    echo json_encode($response);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
