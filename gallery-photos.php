<?php
/**
 * GET → { photos: [...] }
 *
 * Public list of approved photos, newest first. If a valid Bearer token is
 * present the caller's own pending photos are appended (status: 'pending') so
 * an uploader can see their submission is awaiting review. Pending photos are
 * never visible to anyone else.
 */

require_once __DIR__ . '/gallery-config.php';
require_once __DIR__ . '/gallery-auth.php';

gallery_cors('GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    gallery_error('Method not allowed', 405);
}

$db = gallery_db();

// Resolve the caller (if any) so we can flag which photos they may delete.
// An invalid or absent token just leaves $viewer null.
$viewer = null;
$token  = gallery_bearer_token();
if (gallery_valid_token_format($token)) {
    $stmt = $db->prepare(
        'SELECT u.id, u.email
         FROM gallery_sessions s
         JOIN gallery_users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.is_blocked = 0
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $viewer = $stmt->fetch() ?: null;
}
$viewerIsModerator = $viewer && strcasecmp($viewer['email'], GALLERY_MODERATOR_EMAIL) === 0;

$stmt = $db->query(
    "SELECT id, user_id, caption, image_path, width, height, status, created_at
     FROM gallery_photos
     WHERE status = 'approved'
     ORDER BY display_order ASC, id DESC
     LIMIT 500"
);
$photos = $stmt->fetchAll();

// Append the caller's own pending photos so they can see their submission is
// awaiting review. Pending photos are never visible to anyone else.
if ($viewer) {
    $stmt = $db->prepare(
        "SELECT id, user_id, caption, image_path, width, height, status, created_at
         FROM gallery_photos
         WHERE user_id = ? AND status = 'pending'
         ORDER BY id DESC"
    );
    $stmt->execute([$viewer['id']]);
    $photos = array_merge($stmt->fetchAll(), $photos);
}

foreach ($photos as &$photo) {
    $ownerId = (int) $photo['user_id'];
    $photo['can_delete'] = $viewer && ($viewerIsModerator || $ownerId === (int) $viewer['id']);

    $photo['id']        = (int) $photo['id'];
    $photo['width']     = $photo['width'] !== null ? (int) $photo['width'] : null;
    $photo['height']    = $photo['height'] !== null ? (int) $photo['height'] : null;
    $photo['image_src'] = GALLERY_UPLOAD_URL_PATH . '/' . $photo['image_path'];
    // Don't leak the owner's identity or the on-disk filename to the client.
    unset($photo['image_path'], $photo['user_id']);
}
unset($photo);

gallery_json(['photos' => $photos]);
