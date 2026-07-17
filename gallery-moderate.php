<?php
/**
 * Moderation landing page for the approve / reject links in the notification email.
 *
 * GET  ?action=approve|reject&id=N&token=…  → confirmation page showing the photo
 * POST (same params, from that page's form)  → performs the action
 *
 * The mutation deliberately lives behind the POST: mail clients and corporate
 * link scanners routinely fetch every URL in an email, which would silently
 * approve photos if a GET were enough.
 */

require_once __DIR__ . '/gallery-config.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');

function gallery_page(string $title, string $bodyHtml, string $accent = '#2563eb'): void {
    $esc = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    echo <<<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>$esc — Sundial Gallery</title>
<style>
  body { margin:0; padding:24px; background:#f3f4f6; color:#1f2937;
         font-family:system-ui,-apple-system,"Segoe UI",sans-serif; }
  .card { max-width:560px; margin:32px auto; background:#fff; border-radius:12px;
          padding:28px; box-shadow:0 4px 20px rgba(0,0,0,.08); }
  h1 { margin:0 0 8px; font-size:1.35rem; color:$accent; }
  p { line-height:1.55; color:#4b5563; }
  img.photo { display:block; width:100%; height:auto; border-radius:8px;
              border:1px solid #e5e7eb; margin:18px 0; }
  dl { display:grid; grid-template-columns:auto 1fr; gap:6px 14px; margin:0 0 18px; font-size:.92rem; }
  dt { color:#6b7280; } dd { margin:0; }
  .actions { display:flex; gap:10px; flex-wrap:wrap; }
  button { padding:11px 26px; border:none; border-radius:6px; color:#fff;
           font-size:.95rem; font-weight:600; cursor:pointer; }
  .approve { background:#16a34a; } .approve:hover { background:#15803d; }
  .reject  { background:#dc2626; } .reject:hover  { background:#b91c1c; }
  .note { font-size:.8rem; color:#9ca3af; margin-top:16px; }
</style>
</head>
<body><div class="card">$bodyHtml</div></body>
</html>
HTML;
    exit;
}

function gallery_message(string $title, string $message, string $accent = '#2563eb'): void {
    $t = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $m = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    gallery_page($title, "<h1>$t</h1><p>$m</p>", $accent);
}

$action = $_REQUEST['action'] ?? '';
$id     = (int) ($_REQUEST['id'] ?? 0);
$token  = trim((string) ($_REQUEST['token'] ?? ''));

if (!in_array($action, ['approve', 'reject'], true) || $id < 1
    || strlen($token) !== 64 || !ctype_xdigit($token)) {
    http_response_code(400);
    gallery_message('Invalid link', 'This moderation link is malformed.', '#dc2626');
}

$db   = gallery_db();
$stmt = $db->prepare('SELECT * FROM gallery_photos WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$photo = $stmt->fetch();

// Constant-time compare, and never confirm whether the id exists.
if (!$photo || !hash_equals((string) $photo['moderation_token'], $token)) {
    http_response_code(404);
    gallery_message('Invalid link', 'This moderation link is not valid, or the photo has been removed.', '#dc2626');
}

if ($photo['status'] !== 'pending') {
    gallery_message(
        'Already reviewed',
        'This photo was already ' . $photo['status'] . '. Nothing changed.',
        '#6b7280'
    );
}

$esc     = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$imgUrl  = GALLERY_UPLOAD_URL_PATH . '/' . $photo['image_path'];
$caption = $photo['caption'] !== null && $photo['caption'] !== ''
    ? $esc($photo['caption'])
    : '<em style="color:#9ca3af">(no caption)</em>';

// ── Confirmation page ────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $isApprove = $action === 'approve';
    $heading   = $isApprove ? 'Approve this photo?' : 'Reject this photo?';
    $blurb     = $isApprove
        ? 'Approving publishes it to the public gallery immediately.'
        : 'Rejecting deletes the image file from the server. This cannot be undone.';

    $body = '<h1>' . $esc($heading) . '</h1>'
          . '<p>' . $esc($blurb) . '</p>'
          . '<img class="photo" src="' . $esc($imgUrl) . '" alt="">'
          . '<dl>'
          . '<dt>From</dt><dd>' . $esc($photo['uploader_email']) . '</dd>'
          . '<dt>Caption</dt><dd>' . $caption . '</dd>'
          . '<dt>Uploaded</dt><dd>' . $esc($photo['created_at']) . '</dd>'
          . '</dl>'
          . '<form method="post" class="actions">'
          . '<input type="hidden" name="id" value="' . $id . '">'
          . '<input type="hidden" name="token" value="' . $esc($token) . '">'
          . '<button type="submit" name="action" value="approve" class="approve">Approve</button>'
          . '<button type="submit" name="action" value="reject" class="reject">Reject</button>'
          . '</form>'
          . '<p class="note">Nothing has changed yet — this page only confirms your choice.</p>';

    gallery_page($heading, $body, $isApprove ? '#16a34a' : '#dc2626');
}

// ── Perform the action ───────────────────────────────────────────────────────
if ($action === 'approve') {
    $db->prepare("UPDATE gallery_photos SET status = 'approved', moderated_at = NOW() WHERE id = ? AND status = 'pending'")
       ->execute([$id]);

    gallery_page(
        'Approved',
        '<h1>Photo approved</h1>'
        . '<p>It is now live in the gallery.</p>'
        . '<img class="photo" src="' . $esc($imgUrl) . '" alt="">',
        '#16a34a'
    );
}

$db->prepare("UPDATE gallery_photos SET status = 'rejected', moderated_at = NOW() WHERE id = ? AND status = 'pending'")
   ->execute([$id]);

$filePath = GALLERY_UPLOAD_DIR . '/' . basename($photo['image_path']);
if (is_file($filePath)) {
    @unlink($filePath);
}

gallery_page(
    'Rejected',
    '<h1>Photo rejected</h1><p>The image file has been deleted from the server and it will not appear in the gallery.</p>',
    '#dc2626'
);
