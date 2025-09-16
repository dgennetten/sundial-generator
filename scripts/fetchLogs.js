// Enhanced fetchLogs.js: download recent access logs (including rotated .gz) and combine them
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import zlib from 'zlib';
import { promisify } from 'util';

dotenv.config();
dotenv.config({ path: '.env.local' });

import logParser from '../src/utils/logParser.js';

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

const gunzipAsync = promisify(zlib.gunzip);

async function decompressGzipFile(gzPath, outPath) {
  try {
    const gzData = fs.readFileSync(gzPath);

    // Check if file is empty or too small (corrupted)
    if (gzData.length === 0) {
      console.log(`Skipping empty gzip file: ${gzPath}`);
      return null;
    }

    if (gzData.length < 20) {
      console.log(`Skipping corrupted gzip file (too small): ${gzPath}`);
      return null;
    }

    const buf = await gunzipAsync(gzData);
    fs.writeFileSync(outPath, buf);
    return outPath;
  } catch (error) {
    console.error(`Error decompressing ${gzPath}:`, error.message);
    console.log(`Skipping corrupted gzip file: ${gzPath}`);
    return null;
  }
}

/**
 * Download recent log files from SFTP, including rotated .gz logs, and combine them.
 * Returns path to a combined local log file containing last `daysSince` days of entries.
 */
function downloadLogFiles(daysSince = 7) {
  return new Promise((resolve, reject) => {
    console.log('Connecting to SFTP...');

    const conn = new Client();

    conn.on('ready', () => {
      console.log('SFTP connected');

      conn.sftp(async (err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.readdir(LOG_PATH, async (err, list) => {
          if (err) {
            reject(err);
            return;
          }

          // Include access.log, access.log.N and .gz variants
          const accessLogs = list.filter(file =>
            file.filename.includes('access.log')
          );

          if (accessLogs.length === 0) {
            reject(new Error('No access log files found'));
            return;
          }

          // Sort by modification time ascending (oldest first)
          accessLogs.sort((a, b) => a.attrs.mtime - b.attrs.mtime);

          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysSince);
          const startEpoch = Math.floor(startDate.getTime() / 1000);

          // Select files that could contain entries >= startDate
          // Pick any file whose mtime is >= (startDate - 1 day) and always include the latest file
          const ONE_DAY = 24 * 60 * 60;
          const selected = accessLogs.filter(f => f.attrs.mtime >= (startEpoch - ONE_DAY));
          // Ensure the newest file is included
          const newest = accessLogs[accessLogs.length - 1];
          if (!selected.find(f => f.filename === newest.filename)) {
            selected.push(newest);
          }

          console.log('Candidate log files to download:');
          selected.forEach(f => {
            console.log(`  - ${f.filename} (mtime: ${new Date(f.attrs.mtime * 1000).toISOString()})`);
          });

          try {
            // Download and prepare local files
            const localFiles = [];
            for (const file of selected) {
              const remotePath = path.posix.join(LOG_PATH, file.filename);
              const localPath = path.join(LOCAL_LOG_DIR, file.filename);
              console.log(`Downloading ${remotePath} -> ${localPath}`);

              // Download file
              await new Promise((res, rej) => {
                sftp.fastGet(remotePath, localPath, (e) => (e ? rej(e) : res()));
              });

              // If gz, decompress to .log alongside
              if (file.filename.endsWith('.gz')) {
                const outPath = localPath.replace(/\.gz$/, '');
                console.log(`Decompressing ${localPath} -> ${outPath}`);
                const decompressedPath = await decompressGzipFile(localPath, outPath);
                if (decompressedPath) {
                  localFiles.push(decompressedPath);
                } else {
                  console.log(`Skipping ${file.filename} due to decompression failure`);
                }
              } else {
                localFiles.push(localPath);
              }
            }

            // Combine into a single file (keep chronological order)
            const combinedPath = path.join(LOCAL_LOG_DIR, 'combined-access.log');
            fs.writeFileSync(combinedPath, '');
            for (const lf of localFiles) {
              const content = fs.readFileSync(lf);
              fs.appendFileSync(combinedPath, content);
              if (!content.toString().endsWith('\n')) fs.appendFileSync(combinedPath, '\n');
            }

            console.log(`Combined log created: ${combinedPath}`);
            conn.end();
            resolve(combinedPath);
          } catch (e) {
            reject(e);
          }
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

async function processLogFile(logFilePath, daysSince = 7) {
  console.log('Processing logs...');

  if (!fs.existsSync(logFilePath)) {
    throw new Error(`Log file not found: ${logFilePath}`);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysSince);

  // Delegate to the real parser (from src/utils/logParser.js)
  const result = await logParser.processLogFile(logFilePath, startDate);

  // Preserve daysSince in the output for downstream consumers
  return { ...result, daysSince };
}

async function main() {
  const daysSince = parseInt(process.argv[2]) || 7;

  try {
    console.log('Starting...');

    const logFilePath = await downloadLogFiles(daysSince);
    const visitorData = await processLogFile(logFilePath, daysSince);

    console.log('Processing complete!');
    console.log(`Found ${visitorData.totalVisitors} visitors`);

    // Ensure the processedDate reflects the exact moment the file is saved
    // Create a new object without processedDate from visitorData, then add our current timestamp
    const { processedDate: _, ...cleanVisitorData } = visitorData;
    const finalData = {
      ...cleanVisitorData,
      processedDate: new Date().toISOString()
    };
    
    console.log(`📅 Setting processedDate to: ${finalData.processedDate}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
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
