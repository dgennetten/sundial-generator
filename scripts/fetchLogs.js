// Minimal fetchLogs.js to avoid syntax errors
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SFTP_CONFIG = {
  host: process.env.SFTP_HOST,
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD,
  port: parseInt(process.env.SFTP_PORT) || 22
};

const LOG_PATH = process.env.SFTP_LOG_PATH;

if (!SFTP_CONFIG.host || !SFTP_CONFIG.username || !SFTP_CONFIG.password || !LOG_PATH) {
  console.error('Missing SFTP environment variables');
  process.exit(1);
}

const LOCAL_LOG_DIR = path.join(__dirname, '..', 'logs');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'visitor-data.json');

if (!fs.existsSync(LOCAL_LOG_DIR)) {
  fs.mkdirSync(LOCAL_LOG_DIR, { recursive: true });
}

function downloadLogFiles() {
  return new Promise((resolve, reject) => {
    console.log('Connecting to SFTP...');

    const conn = new Client();

    conn.on('ready', () => {
      console.log('SFTP connected');

      conn.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.readdir(LOG_PATH, (err, list) => {
          if (err) {
            reject(err);
            return;
          }

          const accessLogs = list.filter(file =>
            file.filename.includes('access.log') &&
            !file.filename.includes('.gz')
          );

          if (accessLogs.length === 0) {
            reject(new Error('No access log files found'));
            return;
          }

          accessLogs.sort((a, b) => b.attrs.mtime - a.attrs.mtime);
          const latestLog = accessLogs[0];

          const remotePath = path.posix.join(LOG_PATH, latestLog.filename);
          const localPath = path.join(LOCAL_LOG_DIR, latestLog.filename);

          console.log(`Downloading ${remotePath}...`);

          sftp.fastGet(remotePath, localPath, (err) => {
            if (err) {
              reject(err);
              return;
            }

            console.log('Download complete');
            conn.end();
            resolve(localPath);
          });
        });
      });
    });

    conn.on('error', (err) => {
      console.error('SFTP error:', err.message);
      reject(err);
    });

    conn.connect(SFTP_CONFIG);
  });
}

function processLogFile(logFilePath, daysSince = 7) {
  console.log('Processing logs...');

  if (!fs.existsSync(logFilePath)) {
    throw new Error(`Log file not found: ${logFilePath}`);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysSince);

  const logContent = fs.readFileSync(logFilePath, 'utf8');
  const lines = logContent.split('\n');

  console.log(`Processing ${lines.length} lines...`);

  return {
    visitors: [],
    totalVisitors: 0,
    totalVisits: 0,
    processedDate: new Date().toISOString(),
    daysSince: daysSince
  };
}

async function main() {
  const daysSince = parseInt(process.argv[2]) || 7;

  try {
    console.log('Starting...');

    const logFilePath = await downloadLogFiles();
    const visitorData = processLogFile(logFilePath, daysSince);

    console.log('Processing complete!');
    console.log(`Found ${visitorData.totalVisitors} visitors`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(visitorData, null, 2));
    console.log('Data saved');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file:///${__filename.replace(/\\/g, '/')}`) {
  main();
}

export { downloadLogFiles, processLogFile };