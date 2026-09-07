<?php
/**
 * Sundial Settings API
 * Global Admin-panel preferences shared by all clients.
 *
 * GET  /sundial-settings-api.php → { success: true, settings: { ... } }
 * POST /sundial-settings-api.php + { password, settings: { ... } } → upsert
 *
 * Credentials from db-config.php (gitignored) or environment variables.
 * Table is auto-created on first request if missing.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

define('SUNDIAL_ADMIN_PASSWORD', '752192');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (file_exists(__DIR__ . '/db-config.php')) {
    require_once __DIR__ . '/db-config.php';
}

$host = trim($_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'mysql.precisionsundial.com');
$user = trim($_ENV['DB_USER'] ?? getenv('DB_USER') ?? '');
$pass = trim($_ENV['DB_PASS'] ?? getenv('DB_PASS') ?? '');
$name = trim($_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'sundials');

if ($user === '' || $pass === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database credentials not configured']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

function ensure_settings_table(PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS sundial_settings (
            setting_key   VARCHAR(64)  NOT NULL,
            setting_value TEXT         NOT NULL,
            updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (setting_key)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

/** Default settings when no rows exist yet. */
function default_settings(): array {
    return [
        'pinLimit'       => 200,
        'showPerf'       => null, // null = client default (DEV / ?perf)
        'tourStart'      => 'latest',
        'tourOrder'      => 'linear',
        'tourShadow'     => true,
        'tourLength'     => 50,
        'tourSpeed'      => 'normal',
        'tourDuplicates' => 'skip',
    ];
}

function clamp_int($v, int $min, int $max, int $fallback): int {
    if (!is_numeric($v)) return $fallback;
    $n = (int) round((float) $v);
    return max($min, min($max, $n));
}

function normalize_settings(array $raw): array {
    $d = default_settings();
    $out = $d;

    if (array_key_exists('pinLimit', $raw)) {
        $out['pinLimit'] = clamp_int($raw['pinLimit'], 1, 1000, $d['pinLimit']);
    }

    if (array_key_exists('showPerf', $raw)) {
        $v = $raw['showPerf'];
        if ($v === null || $v === 'null' || $v === '') {
            $out['showPerf'] = null;
        } else {
            $out['showPerf'] = filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($out['showPerf'] === null && ($v === true || $v === false || $v === 0 || $v === 1 || $v === '0' || $v === '1')) {
                $out['showPerf'] = (bool) $v;
            }
        }
    }

    $start = isset($raw['tourStart']) ? (string) $raw['tourStart'] : $d['tourStart'];
    $out['tourStart'] = $start === 'earliest' ? 'earliest' : 'latest';

    $order = isset($raw['tourOrder']) ? (string) $raw['tourOrder'] : $d['tourOrder'];
    $out['tourOrder'] = $order === 'random' ? 'random' : 'linear';

    if (array_key_exists('tourShadow', $raw)) {
        $out['tourShadow'] = filter_var($raw['tourShadow'], FILTER_VALIDATE_BOOLEAN);
    }

    if (array_key_exists('tourLength', $raw)) {
        $out['tourLength'] = clamp_int($raw['tourLength'], 5, 200, $d['tourLength']);
    }

    $speed = isset($raw['tourSpeed']) ? (string) $raw['tourSpeed'] : $d['tourSpeed'];
    $out['tourSpeed'] = ($speed === 'slow' || $speed === 'fast') ? $speed : 'normal';

    $dup = isset($raw['tourDuplicates']) ? (string) $raw['tourDuplicates'] : $d['tourDuplicates'];
    $out['tourDuplicates'] = $dup === 'include' ? 'include' : 'skip';

    return $out;
}

function read_settings(PDO $pdo): array {
    ensure_settings_table($pdo);
    $stmt = $pdo->query('SELECT setting_key, setting_value FROM sundial_settings');
    $rows = $stmt->fetchAll();
    $raw = [];
    foreach ($rows as $row) {
        $decoded = json_decode($row['setting_value'], true);
        // Allow plain strings/numbers stored as JSON literals
        if (json_last_error() === JSON_ERROR_NONE) {
            $raw[$row['setting_key']] = $decoded;
        } else {
            $raw[$row['setting_key']] = $row['setting_value'];
        }
    }
    // Support a single JSON blob under key "all"
    if (isset($raw['all']) && is_array($raw['all'])) {
        return normalize_settings($raw['all']);
    }
    return normalize_settings($raw);
}

function write_settings(PDO $pdo, array $settings): void {
    ensure_settings_table($pdo);
    $normalized = normalize_settings($settings);
    $pdo->beginTransaction();
    try {
        // Store as one JSON document under key "all" for atomic updates
        $stmt = $pdo->prepare(
            'INSERT INTO sundial_settings (setting_key, setting_value)
             VALUES (:k, :v)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );
        $stmt->execute([
            ':k' => 'all',
            ':v' => json_encode($normalized, JSON_UNESCAPED_UNICODE),
        ]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        echo json_encode(['success' => true, 'settings' => read_settings($pdo)]);
        exit;
    }

    if ($method === 'POST') {
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
            exit;
        }

        $password = isset($data['password']) ? (string) $data['password'] : '';
        if (!hash_equals(SUNDIAL_ADMIN_PASSWORD, $password)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }

        $incoming = $data['settings'] ?? null;
        if (!is_array($incoming)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing settings object']);
            exit;
        }

        // Merge with existing so partial POSTs are safe
        $merged = array_merge(read_settings($pdo), $incoming);
        write_settings($pdo, $merged);
        echo json_encode(['success' => true, 'settings' => read_settings($pdo)]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error']);
}
