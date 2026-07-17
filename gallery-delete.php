<?php
/**
 * POST { id } + Bearer token → { success, deleted }
 *
 * Deletes a photo and its file. Allowed when the caller owns the photo, or when
 * the caller is the moderator (GALLERY_MODERATOR_EMAIL) — who may delete any
 * photo in the gallery.
 */

require_once __DIR__ . '/gallery-config.php';
require_once __DIR__ . '/gallery-auth.php';

gallery_cors('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gallery_error('Method not allowed', 405);
}

$user = gallery_require_user();
$db   = gallery_db();

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = (int) ($body['id'] ?? 0);
if ($id < 1) {
    gallery_error('Missing id');
}

$stmt = $db->prepare('SELECT id, user_id, image_path FROM gallery_photos WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$photo = $stmt->fetch();

if (!$photo) {
    gallery_error('Not found', 404);
}

$isOwner     = (int) $photo['user_id'] === $user['id'];
$isModerator = strcasecmp($user['email'], GALLERY_MODERATOR_EMAIL) === 0;
if (!$isOwner && !$isModerator) {
    gallery_error('Forbidden', 403);
}

$db->prepare('DELETE FROM gallery_photos WHERE id = ?')->execute([$id]);

// Remove the file after the row is gone. basename() guards against any stray
// path separators in the stored name.
$filePath = GALLERY_UPLOAD_DIR . '/' . basename($photo['image_path']);
if (is_file($filePath)) {
    @unlink($filePath);
}

gallery_json(['success' => true, 'deleted' => $id]);
