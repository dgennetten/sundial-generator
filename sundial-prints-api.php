<?php
/**
 * Sundial Prints API
 * MySQL-backed endpoint for logging and retrieving sundial print/export records.
 *
 * GET  /sundial-prints-api.php           → { prints: [...], totalCount: n }
 * POST /sundial-prints-api.php  + JSON   → { success: true }
 *
 * Credentials are read from db-config.php (gitignored) or environment variables.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $countStmt = $pdo->query('SELECT COUNT(*) FROM sundial_prints');
    $totalCount = (int) $countStmt->fetchColumn();

    $stmt = $pdo->query(
        'SELECT id, location, latitude + 0 AS latitude, longitude + 0 AS longitude,
                inclination + 0 AS inclination, declination + 0 AS declination,
                gnomon_type, notes_type, date_range,
                COALESCE(today_line_active, 0) AS today_line_active,
                config_json,
                created_at
         FROM sundial_prints
         ORDER BY created_at DESC
         LIMIT 200'
    );
    $rows = $stmt->fetchAll();

    // Cast numeric columns to float
    foreach ($rows as &$row) {
        $row['latitude']          = (float) $row['latitude'];
        $row['longitude']         = (float) $row['longitude'];
        $row['inclination']       = (float) $row['inclination'];
        $row['declination']       = (float) $row['declination'];
        $row['id']                = (int)   $row['id'];
        $row['today_line_active'] = (bool)  $row['today_line_active'];
    }
    unset($row);

    echo json_encode(['prints' => $rows, 'totalCount' => $totalCount]);
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

    $latitude          = isset($data['latitude'])          && is_numeric($data['latitude'])    ? (float) $data['latitude']    : null;
    $longitude         = isset($data['longitude'])         && is_numeric($data['longitude'])   ? (float) $data['longitude']   : null;
    $inclination       = isset($data['inclination'])       && is_numeric($data['inclination']) ? (float) $data['inclination'] : null;
    $declination       = isset($data['declination'])       && is_numeric($data['declination']) ? (float) $data['declination'] : 0.0;
    $gnomon_type       = isset($data['gnomon_type'])       ? (string) $data['gnomon_type']     : null;
    $notes_type        = isset($data['notes_type'])        ? (string) $data['notes_type']      : null;
    $date_range        = isset($data['date_range'])        ? (string) $data['date_range']      : null;
    $location          = isset($data['location'])          ? (string) $data['location']        : null;
    $today_line_active = isset($data['today_line_active']) ? (int) (bool) $data['today_line_active'] : 0;
    $config_json       = isset($data['config_json']) && is_string($data['config_json']) ? $data['config_json'] : null;

    if ($latitude === null || $longitude === null || $inclination === null ||
        $gnomon_type === null || $notes_type === null || $date_range === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO sundial_prints (location, latitude, longitude, inclination, declination, gnomon_type, notes_type, date_range, today_line_active, config_json)
         VALUES (:location, :latitude, :longitude, :inclination, :declination, :gnomon_type, :notes_type, :date_range, :today_line_active, :config_json)'
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
        ':config_json'       => $config_json,
    ]);

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
