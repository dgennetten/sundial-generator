/**
 * One-shot: upload email-config.php to the production server.
 * Requires SFTP credentials in .env or .env.local.
 *
 * Usage:  node scripts/upload-email-config.js
 */

import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse env files directly — handles UTF-8 and UTF-16 LE (with or without BOM)
// since Windows editors often save as UTF-16 LE.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const buf = fs.readFileSync(filePath);
  let content;
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    content = buf.slice(2).toString('utf16le'); // UTF-16 LE with BOM
  } else if (buf.length > 1 && buf[1] === 0x00) {
    content = buf.toString('utf16le');           // UTF-16 LE without BOM
  } else {
    content = buf.toString('utf8');
  }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));

const LOCAL_FILE = path.join(__dirname, '..', 'email-config.php');
const REMOTE_PATH = (process.env.FTP_REMOTE_PATH || '/home/dgennetten/sundial.gennetten.org/') + 'email-config.php';

const config = {
  host: process.env.SFTP_HOST || process.env.FTP_HOST,
  username: process.env.SFTP_USERNAME || process.env.FTP_USER,
  password: process.env.SFTP_PASSWORD || process.env.FTP_PASSWORD,
  port: 22,
};

if (!config.host || !config.username || !config.password) {
  console.error('❌ Missing SFTP credentials. Add to .env.local:');
  console.error('   SFTP_HOST=your-server');
  console.error('   SFTP_USERNAME=your-username');
  console.error('   SFTP_PASSWORD=your-password');
  process.exit(1);
}

if (!fs.existsSync(LOCAL_FILE)) {
  console.error('❌ email-config.php not found locally. Copy email-config.example.php and fill in credentials.');
  process.exit(1);
}

const sftp = new Client();
try {
  await sftp.connect(config);
  console.log('✅ Connected');
  await sftp.put(LOCAL_FILE, REMOTE_PATH);
  console.log(`✅ Uploaded email-config.php → ${REMOTE_PATH}`);
} finally {
  await sftp.end();
}
