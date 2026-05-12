/**
 * One-shot: upload sundial-prints-api.php to the production server.
 * Usage:  node scripts/upload-sundial-api.js
 */

import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEPLOY_REMOTE_ROOT } from '../deploy-remote-path.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const buf = fs.readFileSync(filePath);
  let content;
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    content = buf.slice(2).toString('utf16le');
  } else if (buf.length > 1 && buf[1] === 0x00) {
    content = buf.toString('utf16le');
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

const LOCAL_FILE = path.join(__dirname, '..', 'sundial-prints-api.php');
const REMOTE_PATH = path.posix.join(DEPLOY_REMOTE_ROOT, 'sundial-prints-api.php');

const config = {
  host: process.env.SFTP_HOST || process.env.FTP_HOST,
  username: process.env.SFTP_USERNAME || process.env.FTP_USER,
  password: process.env.SFTP_PASSWORD || process.env.FTP_PASSWORD,
  port: 22,
};

const sftp = new Client();
try {
  await sftp.connect(config);
  console.log('✅ Connected');
  await sftp.put(LOCAL_FILE, REMOTE_PATH);
  console.log(`✅ Uploaded sundial-prints-api.php → ${REMOTE_PATH}`);
} finally {
  await sftp.end();
}
