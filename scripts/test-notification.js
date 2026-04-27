/**
 * Smoke-test for export-logger.php.
 * Posts a fake export event and prints the full server response so you can
 * confirm whether emailSent is true and, if not, what the error is.
 *
 * Usage:  node scripts/test-notification.js
 */

const ENDPOINT = 'https://sundial.gennetten.org/export-logger.php';

const payload = {
  exportFormat: 'TEST',
  pageSize: 'Letter',
  dateRange: 'Test (do not archive)',
  gnomonType: 'Test',
  locationName: 'Notification Test',
  sundialNotesMode: 'none',
  dialTextBlock: '',
  dialTextBlockInterpreted: '',
  latitude: 40.7128,
  longitude: -74.006,
};

async function main() {
  console.log(`POST ${ENDPOINT}\n`);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  console.log(`HTTP ${res.status} ${res.statusText}\n`);

  let parsed;
  try {
    parsed = JSON.parse(text);
    console.log('Response JSON:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log('Raw response (not JSON):');
    console.log(text);
    return;
  }

  console.log('\n--- Summary ---');
  console.log('  emailSent :', parsed.emailSent);
  if (!parsed.emailSent) {
    console.log('  emailError:', parsed.emailError || '(none)');
    const smtp = parsed.debug?.smtpSettings;
    if (smtp) {
      console.log('  hasPassword:', smtp.hasPassword, `(${smtp.passwordLength} chars)`);
    }
    console.log('\n  Action needed: re-create email-config.php on the server.');
    console.log('  Copy email-config.example.php → email-config.php and fill in SMTP_PASSWORD.');
  } else {
    console.log('\n  Notification is working correctly.');
  }
}

main().catch(err => {
  console.error('Request failed:', err.message);
  process.exit(1);
});
