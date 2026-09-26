<?php
/**
 * Follow-up landing page for rating / unsubscribe links in the day-5 email.
 *
 * GET  ?action=rate&rating=worked|problem&token=…  → confirmation
 * GET  ?action=unsub&token=…                       → confirmation
 * POST (same params, optional note)                → performs the action
 *
 * Mutations are POST-only so mail scanners cannot record a rating or unsubscribe.
 */

require_once __DIR__ . '/feedback-config.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');

function feedback_page(string $title, string $bodyHtml, string $accent = '#2563eb'): void {
    $esc = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    echo <<<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>$esc — Precision Sundial</title>
<style>
  body { margin:0; padding:24px; background:#f3f4f6; color:#1f2937;
         font-family:system-ui,-apple-system,"Segoe UI",sans-serif; }
  .card { max-width:520px; margin:32px auto; background:#fff; border-radius:12px;
          padding:28px; box-shadow:0 4px 20px rgba(0,0,0,.08); }
  h1 { margin:0 0 8px; font-size:1.35rem; color:$accent; }
  p { line-height:1.55; color:#4b5563; }
  textarea { width:100%; box-sizing:border-box; min-height:90px; margin:12px 0 16px;
             padding:10px; border:1px solid #d1d5db; border-radius:6px; font:inherit; }
  .actions { display:flex; gap:10px; flex-wrap:wrap; }
  button, .btn { padding:11px 26px; border:none; border-radius:6px; color:#fff;
           font-size:.95rem; font-weight:600; cursor:pointer; text-decoration:none;
           display:inline-block; }
  .confirm { background:#2563eb; } .confirm:hover { background:#1d4ed8; }
  .quiet { background:#6b7280; } .quiet:hover { background:#4b5563; }
  .note { font-size:.8rem; color:#9ca3af; margin-top:16px; }
</style>
</head>
<body><div class="card">$bodyHtml</div></body>
</html>
HTML;
    exit;
}

function feedback_message(string $title, string $message, string $accent = '#2563eb'): void {
    $t = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $m = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $photos = htmlspecialchars(FEEDBACK_PUBLIC_URL . '/?photos=1', ENT_QUOTES, 'UTF-8');
    feedback_page(
        $title,
        "<h1>$t</h1><p>$m</p><p><a class=\"btn confirm\" href=\"$photos\">Add a photo</a></p>",
        $accent
    );
}

$action = (string) ($_REQUEST['action'] ?? '');
$token = trim((string) ($_REQUEST['token'] ?? ''));
$rating = trim((string) ($_REQUEST['rating'] ?? ''));

if ($token === '' || strlen($token) !== 64 || !ctype_xdigit($token)) {
    http_response_code(400);
    feedback_message('Invalid link', 'This follow-up link is malformed.', '#dc2626');
}

if (!in_array($action, ['rate', 'unsub'], true)) {
    http_response_code(400);
    feedback_message('Invalid link', 'This follow-up link is malformed.', '#dc2626');
}

if ($action === 'rate' && !in_array($rating, ['worked', 'problem'], true)) {
    http_response_code(400);
    feedback_message('Invalid link', 'This follow-up link is malformed.', '#dc2626');
}

try {
    $db = gallery_db();
    feedback_ensure_schema($db);
} catch (Exception $e) {
    http_response_code(500);
    feedback_message('Unavailable', 'Please try again in a few minutes.', '#dc2626');
}

if ($action === 'rate') {
    $stmt = $db->prepare('SELECT * FROM feedback_followups WHERE token = ? LIMIT 1');
    $stmt->execute([$token]);
} else {
    $stmt = $db->prepare('SELECT * FROM feedback_followups WHERE unsubscribe_token = ? LIMIT 1');
    $stmt->execute([$token]);
}
$row = $stmt->fetch();

if (!$row) {
    http_response_code(404);
    feedback_message('Invalid link', 'This follow-up link is not valid, or has already been used.', '#dc2626');
}

if (!empty($row['unsubscribed_at']) && $action === 'unsub') {
    feedback_message('Unsubscribed', 'You are already unsubscribed from sundial follow-up emails.');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'POST') {
    if ($action === 'unsub') {
        $body = '<h1>Unsubscribe?</h1>'
            . '<p>Stop follow-up emails about sundials you export or print.</p>'
            . '<form method="post">'
            . '<input type="hidden" name="action" value="unsub">'
            . '<input type="hidden" name="token" value="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . '">'
            . '<div class="actions"><button class="confirm" type="submit">Unsubscribe</button></div>'
            . '</form>'
            . '<p class="note">Nothing happens until you click the button.</p>';
        feedback_page('Unsubscribe', $body);
    }

    $label = $rating === 'worked' ? 'It worked' : 'Had a problem';
    $body = '<h1>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '?</h1>'
        . '<p>Confirm this rating. You can add a short note if you like — or reply to the email.</p>'
        . '<form method="post">'
        . '<input type="hidden" name="action" value="rate">'
        . '<input type="hidden" name="rating" value="' . htmlspecialchars($rating, ENT_QUOTES, 'UTF-8') . '">'
        . '<input type="hidden" name="token" value="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . '">'
        . '<textarea name="note" maxlength="5000" placeholder="Optional note"></textarea>'
        . '<div class="actions"><button class="confirm" type="submit">Send</button></div>'
        . '</form>'
        . '<p class="note">Nothing is recorded until you click Send. Mail scanners cannot submit this for you.</p>';
    feedback_page('Confirm rating', $body);
}

if ($action === 'unsub') {
    $db->prepare('UPDATE feedback_followups SET unsubscribed_at = NOW() WHERE id = ?')->execute([$row['id']]);
    feedback_log_event('followup_unsubscribed', ['id' => $row['id']]);
    feedback_message('Unsubscribed', 'You will not get another sundial follow-up email.');
}

$note = trim((string) ($_POST['note'] ?? ''));
if (mb_strlen($note) > 5000) {
    $note = mb_substr($note, 0, 5000);
}

$db->prepare(
    'UPDATE feedback_followups SET responded_at = NOW(), rating = ? WHERE id = ?'
)->execute([$rating, $row['id']]);

$location = trim((string) ($row['location_name'] ?? 'Unknown'));
$body = "Sundial Generator Feedback\n\n";
$body .= 'Source: followup' . "\n";
$body .= 'Event: nudge_rated' . "\n";
$body .= "Rating: $rating\n";
if (!empty($row['export_format'])) {
    $body .= 'Format: ' . $row['export_format'] . "\n";
}
$body .= 'Reply email: ' . $row['email'] . "\n";
$body .= "Dial location name: $location\n\n";
$body .= "Feedback:\n" . str_repeat('-', 50) . "\n";
$body .= ($note !== '' ? $note : '(no comment)') . "\n";
$body .= str_repeat('-', 50) . "\n";

feedback_send_owner_mail("Feedback [$rating] $location", $body, $row['email']);
feedback_log_event('followup_rated', [
    'id' => $row['id'],
    'rating' => $rating,
    'commented' => $note !== '' ? 'yes' : '',
    'location' => $location,
]);

$thanks = $rating === 'worked'
    ? 'Thanks — glad it worked. A photo of the finished dial is always welcome.'
    : 'Thanks — I will take a look at what went wrong.';
feedback_message('Thank you', $thanks);
