<?php
/**
 * POST multipart (image, caption) + Bearer token → { success, photo }
 *
 * Stores the file under gallery-uploads/ with a random name, records it as
 * 'pending', and emails the moderator one-click approve / reject links.
 * Nothing reaches the public gallery until that link is clicked.
 */

require_once __DIR__ . '/gallery-config.php';
require_once __DIR__ . '/gallery-auth.php';

gallery_cors('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gallery_error('Method not allowed', 405);
}

$user = gallery_require_user();
$db   = gallery_db();

if (empty($_FILES['image'])) {
    gallery_error('No file uploaded');
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    $tooBig = in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
    gallery_error($tooBig ? 'That image is too large.' : 'Upload failed. Please try again.');
}
if ($file['size'] > GALLERY_MAX_UPLOAD_BYTES) {
    gallery_error('That image is too large.');
}

// Trust the file's contents, not its name or the client-declared type.
$imageInfo = @getimagesize($file['tmp_name']);
if ($imageInfo === false) {
    gallery_error('That file is not a readable image.');
}

$extByType = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_WEBP => 'webp',
];
$imageType = $imageInfo[2];
if (!isset($extByType[$imageType])) {
    gallery_error('Only JPEG, PNG and WebP images are supported.');
}

$caption = trim((string) ($_POST['caption'] ?? ''));
if (mb_strlen($caption) > GALLERY_CAPTION_MAX_LENGTH) {
    $caption = mb_substr($caption, 0, GALLERY_CAPTION_MAX_LENGTH);
}

// Cap how much a single account can leave sitting in the review queue.
$stmt = $db->prepare("SELECT COUNT(*) FROM gallery_photos WHERE user_id = ? AND status = 'pending'");
$stmt->execute([$user['id']]);
if ((int) $stmt->fetchColumn() >= GALLERY_MAX_PENDING_PER_USER) {
    gallery_error('You already have photos awaiting review. Please wait for those to be approved.', 429);
}

if (!is_dir(GALLERY_UPLOAD_DIR) && !mkdir(GALLERY_UPLOAD_DIR, 0755, true) && !is_dir(GALLERY_UPLOAD_DIR)) {
    error_log('gallery: could not create upload dir ' . GALLERY_UPLOAD_DIR);
    gallery_error('Could not save the image.', 500);
}

$filename = bin2hex(random_bytes(16)) . '.' . $extByType[$imageType];
$destPath = GALLERY_UPLOAD_DIR . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    error_log('gallery: move_uploaded_file failed for ' . $destPath);
    gallery_error('Could not save the image.', 500);
}
@chmod($destPath, 0644);

/**
 * Shrinks the longest edge to GALLERY_MAX_DIMENSION and strips EXIF (which can
 * carry GPS coordinates) by re-encoding. No-ops without GD or if already small.
 *
 * @return array{0:int,1:int} final [width, height]
 */
function gallery_downscale(string $path, int $type, int $width, int $height): array {
    if (!function_exists('imagecreatetruecolor')) {
        return [$width, $height];
    }
    $longest = max($width, $height);
    if ($longest <= GALLERY_MAX_DIMENSION) {
        return [$width, $height];
    }

    $scale     = GALLERY_MAX_DIMENSION / $longest;
    $newWidth  = max(1, (int) round($width * $scale));
    $newHeight = max(1, (int) round($height * $scale));

    switch ($type) {
        case IMAGETYPE_JPEG: $src = @imagecreatefromjpeg($path); break;
        case IMAGETYPE_PNG:  $src = @imagecreatefrompng($path);  break;
        case IMAGETYPE_WEBP: $src = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false; break;
        default:             $src = false;
    }
    if (!$src) {
        return [$width, $height];
    }

    $dst = imagecreatetruecolor($newWidth, $newHeight);
    if ($type === IMAGETYPE_PNG || $type === IMAGETYPE_WEBP) {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    $ok = false;
    switch ($type) {
        case IMAGETYPE_JPEG: $ok = imagejpeg($dst, $path, 85); break;
        case IMAGETYPE_PNG:  $ok = imagepng($dst, $path, 6);   break;
        case IMAGETYPE_WEBP: $ok = function_exists('imagewebp') && imagewebp($dst, $path, 85); break;
    }
    imagedestroy($src);
    imagedestroy($dst);

    return $ok ? [$newWidth, $newHeight] : [$width, $height];
}

[$finalWidth, $finalHeight] = gallery_downscale($destPath, $imageType, (int) $imageInfo[0], (int) $imageInfo[1]);

$moderationToken = bin2hex(random_bytes(32));

// The moderator's own uploads skip review and publish immediately; everyone
// else lands in 'pending' and triggers the approval email.
$isModerator = strcasecmp($user['email'], GALLERY_MODERATOR_EMAIL) === 0;
$status      = $isModerator ? 'approved' : 'pending';

try {
    $stmt = $db->prepare(
        "INSERT INTO gallery_photos (user_id, uploader_email, caption, image_path, width, height, moderation_token, uploader_ip, status, moderated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, " . ($isModerator ? 'NOW()' : 'NULL') . ')'
    );
    $stmt->execute([
        $user['id'],
        $user['email'],
        $caption !== '' ? $caption : null,
        $filename,
        $finalWidth,
        $finalHeight,
        $moderationToken,
        gallery_client_ip(),
        $status,
    ]);
    $photoId = (int) $db->lastInsertId();
} catch (Exception $e) {
    @unlink($destPath);
    error_log('gallery upload insert failed: ' . $e->getMessage());
    gallery_error('Could not save the image.', 500);
}

// ── Moderator notification ───────────────────────────────────────────────────
// Skipped entirely for the moderator's own (already-approved) uploads.
if (!$isModerator) {
$imageUrl   = GALLERY_PUBLIC_URL . GALLERY_UPLOAD_URL_PATH . '/' . $filename;
$approveUrl = GALLERY_PUBLIC_URL . '/gallery-moderate.php?action=approve&id=' . $photoId . '&token=' . $moderationToken;
$rejectUrl  = GALLERY_PUBLIC_URL . '/gallery-moderate.php?action=reject&id='  . $photoId . '&token=' . $moderationToken;

$esc = fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$captionHtml = $caption !== '' ? $esc($caption) : '<em style="color:#9ca3af">(no caption)</em>';

$html = '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1f2937;max-width:520px">'
      . '<h2 style="margin:0 0 4px;font-size:18px">New sundial photo awaiting approval</h2>'
      . '<p style="margin:0 0 16px;color:#6b7280;font-size:13px">It stays hidden from the gallery until you approve it.</p>'
      . '<table style="font-size:14px;border-collapse:collapse;margin-bottom:16px">'
      . '<tr><td style="padding:2px 12px 2px 0;color:#6b7280">From</td><td>' . $esc($user['email']) . '</td></tr>'
      . '<tr><td style="padding:2px 12px 2px 0;color:#6b7280">Caption</td><td>' . $captionHtml . '</td></tr>'
      . '<tr><td style="padding:2px 12px 2px 0;color:#6b7280">Size</td><td>' . $finalWidth . ' × ' . $finalHeight . ' px</td></tr>'
      . '<tr><td style="padding:2px 12px 2px 0;color:#6b7280">IP</td><td>' . $esc(gallery_client_ip()) . '</td></tr>'
      . '</table>'
      . '<p style="margin:0 0 16px"><img src="' . $esc($imageUrl) . '" alt="" style="max-width:480px;height:auto;border-radius:8px;border:1px solid #e5e7eb"></p>'
      . '<p style="margin:0 0 8px">'
      . '<a href="' . $esc($approveUrl) . '" style="display:inline-block;padding:10px 22px;margin-right:8px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Approve</a>'
      . '<a href="' . $esc($rejectUrl) . '" style="display:inline-block;padding:10px 22px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reject</a>'
      . '</p>'
      . '<p style="margin:12px 0 0;font-size:12px;color:#9ca3af">Rejecting deletes the file from the server.</p>'
      . '</div>';

// The photo is attached as well, so the decision is possible even when the mail
// client blocks remote images.
gallery_send_mail(
    GALLERY_MODERATOR_EMAIL,
    'Sundial photo pending approval — ' . $user['email'],
    $html,
    true,
    [$destPath]
);
} // end moderator-notification guard

gallery_json([
    'success' => true,
    'photo'   => [
        'id'         => $photoId,
        'caption'    => $caption !== '' ? $caption : null,
        'image_src'  => GALLERY_UPLOAD_URL_PATH . '/' . $filename,
        'width'      => $finalWidth,
        'height'     => $finalHeight,
        'status'     => $status,
        'can_delete' => true,
    ],
], 201);
