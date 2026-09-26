<?php
/**
 * Send due feedback follow-up emails.
 *
 * Dreamhost cron (hourly):
 *   php /home/dgennetten/precisionsundial.com/feedback-followup-cron.php
 *
 * HTTP is allowed only when FEEDBACK_CRON_KEY is set:
 *   /feedback-followup-cron.php?key=...
 */

require_once __DIR__ . '/feedback-config.php';

$isCli = PHP_SAPI === 'cli';
if (!$isCli) {
    $expected = trim((string) ($_ENV['FEEDBACK_CRON_KEY'] ?? getenv('FEEDBACK_CRON_KEY') ?: ''));
    $provided = trim((string) ($_GET['key'] ?? ''));
    if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Forbidden\n";
        exit;
    }
}

try {
    $db = gallery_db();
    feedback_ensure_schema($db);
} catch (Exception $e) {
    error_log('feedback-followup-cron: db failed: ' . $e->getMessage());
    if ($isCli) {
        fwrite(STDERR, "db failed\n");
        exit(1);
    }
    http_response_code(500);
    echo "db failed\n";
    exit;
}

$stmt = $db->prepare(
    'SELECT * FROM feedback_followups
     WHERE sent_at IS NULL
       AND unsubscribed_at IS NULL
       AND send_after <= NOW()
     ORDER BY send_after ASC
     LIMIT 25'
);
$stmt->execute();
$rows = $stmt->fetchAll();

$sent = 0;
$failed = 0;
$base = FEEDBACK_PUBLIC_URL;

foreach ($rows as $row) {
    $location = trim((string) ($row['location_name'] ?? ''));
    $locationLabel = $location !== '' ? $location : 'your location';
    $rateWorked = $base . '/feedback-followup.php?action=rate&rating=worked&token=' . urlencode($row['token']);
    $rateProblem = $base . '/feedback-followup.php?action=rate&rating=problem&token=' . urlencode($row['token']);
    $photos = $base . '/?photos=1';
    $unsub = $base . '/feedback-followup.php?action=unsub&token=' . urlencode($row['unsubscribe_token']);

    $html = '<p>How did your sundial turn out?</p>'
        . '<p>You exported a sundial for <strong>' . htmlspecialchars($locationLabel, ENT_QUOTES, 'UTF-8') . '</strong>. '
        . 'Reply to this email and tell me how it went — bugs, ideas, or a photo of the finished dial.</p>'
        . '<p>'
        . '<a href="' . htmlspecialchars($rateWorked, ENT_QUOTES, 'UTF-8') . '">It worked</a>'
        . ' &nbsp;·&nbsp; '
        . '<a href="' . htmlspecialchars($rateProblem, ENT_QUOTES, 'UTF-8') . '">Had a problem</a>'
        . ' &nbsp;·&nbsp; '
        . '<a href="' . htmlspecialchars($photos, ENT_QUOTES, 'UTF-8') . '">Add a photo</a>'
        . '</p>'
        . '<p style="font-size:12px;color:#6b7280">If you would rather not get another note like this, '
        . '<a href="' . htmlspecialchars($unsub, ENT_QUOTES, 'UTF-8') . '">unsubscribe</a>.</p>';

    $ok = feedback_send_user_mail($row['email'], 'How did your sundial turn out?', $html);

    if ($ok) {
        $update = $db->prepare('UPDATE feedback_followups SET sent_at = NOW() WHERE id = ? AND sent_at IS NULL');
        $update->execute([$row['id']]);
        $sent++;
        feedback_log_event('followup_sent', [
            'id' => $row['id'],
            'location' => $location,
            'format' => $row['export_format'] ?? '',
        ]);
    } else {
        $failed++;
        feedback_log_event('followup_send_failed', ['id' => $row['id']]);
    }
}

$summary = "sent=$sent failed=$failed due=" . count($rows) . "\n";
if ($isCli) {
    echo $summary;
    exit($failed > 0 ? 1 : 0);
}

header('Content-Type: text/plain; charset=utf-8');
echo $summary;
