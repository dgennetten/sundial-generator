// Script to fetch logs via SFTP and process visitor data
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env and .env.local
dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SFTP configuration - loaded from environment variables
const SFTP_CONFIG = {
  host: process.env.SFTP_HOST,
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD,
  port: parseInt(process.env.SFTP_PORT) || 22
};

const LOG_PATH = process.env.SFTP_LOG_PATH;

// Validate required environment variables
if (!SFTP_CONFIG.host || !SFTP_CONFIG.username || !SFTP_CONFIG.password || !LOG_PATH) {
  console.error('❌ Error: Missing required SFTP environment variables:');
  console.error(`   SFTP_HOST: ${SFTP_CONFIG.host ? '✅ Set' : '❌ Missing'}`);
  console.error(`   SFTP_USERNAME: ${SFTP_CONFIG.username ? '✅ Set' : '❌ Missing'}`);
  console.error(`   SFTP_PASSWORD: ${SFTP_CONFIG.password ? '✅ Set' : '❌ Missing'}`);
  console.error(`   SFTP_LOG_PATH: ${LOG_PATH ? '✅ Set' : '❌ Missing'}`);
  console.log('💡 Please check your .env file and ensure all SFTP variables are set');
  process.exit(1);
}

const LOCAL_LOG_DIR = path.join(__dirname, '..', 'logs');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'visitor-data.json');

// Ensure local log directory exists
if (!fs.existsSync(LOCAL_LOG_DIR)) {
  fs.mkdirSync(LOCAL_LOG_DIR, { recursive: true });
}

// Manual corrections for known problematic IPs
const MANUAL_IP_CORRECTIONS = {
  '212.97.70.29': {
    country: 'Portugal',
    countryCode: 'PT',
    region: 'Lisbon',
    city: 'Lisbon',
    lat: 38.7223,
    lon: -9.1393,
    timezone: 'Europe/Lisbon'
  }
  // Add more manual corrections here as needed
};

// Get manual correction if available
function getManualCorrection(ip) {
  return MANUAL_IP_CORRECTIONS[ip] || null;
}

// Check if geolocation data seems suspicious based on IP range knowledge
function isSuspiciousGeolocation(ip, visitor) {
  const ipParts = ip.split('.').map(Number);

  // Check for known IP range mismatches
  // Portugal range: 212.97.0.0 - 212.97.255.255 should be Portugal, not Liechtenstein
  if (ipParts[0] === 212 && ipParts[1] === 97 && visitor.country === 'Liechtenstein') {
    return true;
  }

  // Check if we have a manual correction for this IP
  if (getManualCorrection(ip)) {
    return true;
  }

  // Add more suspicious pattern checks here as needed
  // For example, other known incorrect mappings

  return false;
}

// Simple IP geolocation using a free service with retry logic
async function getLocationFromIP(ip, retries = 3) {
  try {
    // Skip local/private IPs
    if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
      return null;
    }

    // Skip other private IP ranges
    if (ip.startsWith('172.')) {
      const secondOctet = parseInt(ip.split('.')[1]);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return null;
      }
    }

    // Skip other common private/reserved ranges
    if (ip.startsWith('169.254.') || ip.startsWith('224.') || ip.startsWith('240.')) {
      return null;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query`);

        if (!response.ok) {
          if (attempt === retries) {
            console.error(`HTTP error for IP ${ip}: ${response.status} (final attempt)`);
            return null;
          }
          console.log(`HTTP error for IP ${ip}: ${response.status} (attempt ${attempt}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }

        const data = await response.json();

        if (data.status === 'success') {
          return {
            ip: data.query,
            country: data.country,
            countryCode: data.countryCode,
            region: data.regionName,
            city: data.city,
            lat: data.lat,
            lon: data.lon,
            timezone: data.timezone
          };
        } else {
          if (data.status === 'fail' && data.message === 'private range') {
            return null; // Don't retry for private IPs
          }
          if (attempt === retries) {
            console.log(`Geolocation failed for IP ${ip}: ${data.message || 'Unknown error'} (final attempt)`);
          } else {
            console.log(`Geolocation failed for IP ${ip}: ${data.message || 'Unknown error'} (attempt ${attempt}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      } catch (fetchError) {
        if (attempt === retries) {
          console.error(`Network error for IP ${ip}: ${fetchError.message} (final attempt)`);
        } else {
          console.log(`Network error for IP ${ip}: ${fetchError.message} (attempt ${attempt}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  } catch (error) {
    console.error(`Unexpected error getting location for IP ${ip}:`, error.message);
  }
  return null;
}

// Parse Apache log timestamp to Date object
function parseApacheTimestamp(timestampStr) {
  // Remove brackets if present
  const cleanTimestamp = timestampStr.replace(/\[|\]/g, '');
  // Convert [07/Sep/2025:10:24:40 -0700] to Sep 07, 2025 10:24:40 -0700
  const formatted = cleanTimestamp.replace(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (.+)/, '$2 $1, $3 $4:$5:$6 $7');
  return new Date(formatted);
}

// Parse Apache/Nginx access log line
function parseLogLine(line) {
  // Common Log Format: IP - - [timestamp] "method path protocol" status size "referer" "user-agent"
  const logRegex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\S+) "([^"]*)" "([^"]*)"/;
  const match = line.match(logRegex);

  if (match) {
    return {
      ip: match[1],
      timestamp: match[2],
      method: match[3],
      path: match[4],
      protocol: match[5],
      status: parseInt(match[6]),
      size: match[7],
      referer: match[8],
      userAgent: match[9]
    };
  }
  return null;
}

// Download log files from SFTP
function downloadLogFiles() {
  return new Promise((resolve, reject) => {
    console.log('🔗 Establishing SFTP connection...');
    console.log(`📡 Host: ${SFTP_CONFIG.host}`);
    console.log(`👤 Username: ${SFTP_CONFIG.username}`);
    console.log(`📁 Log path: ${LOG_PATH}`);

    const conn = new Client();

    conn.on('ready', () => {
      console.log('✅ SFTP connection established successfully');

      conn.sftp((err, sftp) => {
        if (err) {
          console.error('❌ SFTP session error:', err.message);
          reject(err);
          return;
        }

        // List files in the log directory
        sftp.readdir(LOG_PATH, (err, list) => {
          if (err) {
            reject(err);
            return;
          }

          console.log('Available log files:');
          list.forEach(file => {
            console.log(`  ${file.filename} (${file.attrs.size} bytes)`);
          });

          // Download the most recent access log
          const accessLogs = list.filter(file =>
            file.filename.includes('access.log') &&
            !file.filename.includes('.gz')
          );

          if (accessLogs.length === 0) {
            reject(new Error('No access log files found'));
            return;
          }

          // Sort by modification time and get the most recent
          accessLogs.sort((a, b) => b.attrs.mtime - a.attrs.mtime);
          const latestLog = accessLogs[0];

          const remotePath = path.posix.join(LOG_PATH, latestLog.filename);
          const localPath = path.join(LOCAL_LOG_DIR, latestLog.filename);

          console.log(`Downloading ${remotePath} to ${localPath}...`);

          sftp.fastGet(remotePath, localPath, (err) => {
            if (err) {
              reject(err);
              return;
            }

            console.log('Log file downloaded successfully');
            conn.end();
            resolve(localPath);
          });
        });
      });
    });

    conn.on('error', (err) => {
      console.error('❌ SFTP connection error:', err.message);
      reject(err);
    });

    conn.on('close', () => {
      console.log('🔌 SFTP connection closed');
    });

    console.log('🔌 Connecting to SFTP server...');
    conn.connect(SFTP_CONFIG);
  });
}

// Process log file and extract visitor data
async function processLogFile(logFilePath, daysSince = 7) {
  console.log(`🔍 Starting log file processing...`);
  console.log(`📁 Log file path: ${logFilePath}`);
  console.log(`📅 Processing last ${daysSince} days`);

  const visitors = new Map(); // Use IP as key to avoid duplicates
  const visitCounts = new Map(); // Track visit counts per location
  const failedIPs = new Set(); // Track IPs that failed geolocation

  // Check if log file exists
  if (!fs.existsSync(logFilePath)) {
    throw new Error(`Log file not found: ${logFilePath}`);
  }

  console.log(`📄 Log file size: ${fs.statSync(logFilePath).size} bytes`);

  // Load existing visitor data to merge with new data
  let existingData = null;
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const existingContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
      existingData = JSON.parse(existingContent);
      console.log(`📚 Found existing visitor data with ${existingData.totalVisitors} visitors`);

      // Load existing visitors into our maps
      existingData.visitors.forEach(visitor => {
        visitors.set(visitor.ip, visitor);
        const locationKey = `${visitor.lat},${visitor.lon}`;
        visitCounts.set(locationKey, visitor.visitCount);
      });
    } else {
      console.log(`📝 No existing visitor data found, starting fresh`);
    }
  } catch (error) {
    console.log('⚠️  Could not load existing visitor data, starting fresh:', error.message);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysSince);

  try {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');

    console.log(`Processing ${lines.length} log lines from the last ${daysSince} days...`);
    console.log(`Start date filter: ${startDate.toISOString()}`);

    let processedCount = 0;
    let skippedOldEntries = 0;
    let skippedStaticFiles = 0;
    let skippedDuplicateIPs = 0;
    let failedGeolocations = 0;
    let totalLogEntries = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const logEntry = parseLogLine(line);
      if (!logEntry) continue;

      totalLogEntries++;

      // Parse timestamp and filter by date
      const logDate = parseApacheTimestamp(logEntry.timestamp);

      if (logDate < startDate) {
        skippedOldEntries++;
        continue;
      }

      // Skip non-HTML requests (images, CSS, JS, etc.)
      if (logEntry.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i)) {
        skippedStaticFiles++;
        continue;
      }

      // If we already have this IP, update visit count and last visit
      if (visitors.has(logEntry.ip)) {
        const visitor = visitors.get(logEntry.ip);
        visitor.lastVisit = logEntry.timestamp;
        visitor.visitCount = (visitor.visitCount || 1) + 1;

        // Refresh geolocation data if it's been more than 30 days since first visit
        // This helps correct incorrect geolocation data from the past
        const firstVisitDate = parseApacheTimestamp(visitor.firstVisit);
        const daysSinceFirstVisit = (new Date() - firstVisitDate) / (1000 * 60 * 60 * 24);

        // Also refresh if geolocation data seems suspicious
        const isSuspiciousLocation = isSuspiciousGeolocation(logEntry.ip, visitor);

        if (daysSinceFirstVisit > 30 || isSuspiciousLocation) {
          const reason = daysSinceFirstVisit > 30 ? `${Math.round(daysSinceFirstVisit)} days old` : 'suspicious location data';
          console.log(`Refreshing geolocation for existing IP: ${logEntry.ip} (${reason})`);

          // Check for manual correction first
          const manualCorrection = getManualCorrection(logEntry.ip);
          let refreshedLocation = manualCorrection;

          if (!manualCorrection) {
            // Fall back to geolocation service
            refreshedLocation = await getLocationFromIP(logEntry.ip);
          }

          if (refreshedLocation) {
            // Update all location fields
            Object.assign(visitor, refreshedLocation);
            const source = manualCorrection ? 'manual correction' : 'geolocation service';
            console.log(`✅ Updated geolocation for ${logEntry.ip}: ${refreshedLocation.city}, ${refreshedLocation.country} (${source})`);
          }
        }

        const locationKey = `${visitor.lat},${visitor.lon}`;
        visitCounts.set(locationKey, visitor.visitCount);
        skippedDuplicateIPs++;
        continue;
      }

      // Get geolocation for new IP
      console.log(`Looking up geolocation for new IP: ${logEntry.ip}`);
      const location = await getLocationFromIP(logEntry.ip);
      if (location) {
        const newVisitor = {
          ...location,
          firstVisit: logEntry.timestamp,
          lastVisit: logEntry.timestamp,
          visitCount: 1
        };
        visitors.set(logEntry.ip, newVisitor);

        const locationKey = `${location.lat},${location.lon}`;
        visitCounts.set(locationKey, 1);

        processedCount++;
        console.log(`✅ Processed new visitor ${processedCount}: ${location.city}, ${location.country} (${logEntry.ip})`);
      } else {
        failedGeolocations++;
        failedIPs.add(logEntry.ip);
        console.log(`❌ Failed to get location for IP: ${logEntry.ip}`);
      }

      // Add delay to respect rate limits (ip-api.com allows 45 requests per minute)
      // Reduce delay frequency to process more visitors faster
      if (processedCount % 15 === 0 && processedCount > 0) {
        console.log(`Processed ${processedCount} unique visitors, pausing for rate limit...`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Reduced from 2000ms
      }
    }

    // Log processing statistics
    console.log('\n📊 Processing Statistics:');
    console.log(`Total log entries parsed: ${totalLogEntries}`);
    console.log(`Skipped (too old): ${skippedOldEntries}`);
    console.log(`Skipped (static files): ${skippedStaticFiles}`);
    console.log(`Skipped (duplicate IPs): ${skippedDuplicateIPs}`);
    console.log(`Failed geolocations: ${failedGeolocations}`);
    console.log(`Successfully processed unique visitors: ${processedCount}`);

    // Save failed IPs for debugging
    if (failedIPs.size > 0) {
      const failedIPsFile = path.join(__dirname, '..', 'logs', 'failed-ips.txt');
      fs.writeFileSync(failedIPsFile, Array.from(failedIPs).join('\n'));
      console.log(`Failed IPs saved to: ${failedIPsFile}`);
    }

    // Convert to array (visit counts are already stored in visitor objects)
    const visitorData = Array.from(visitors.values());

    return {
      visitors: visitorData,
      totalVisitors: visitorData.length,
      totalVisits: visitorData.reduce((sum, visitor) => sum + (visitor.visitCount || 1), 0),
      processedDate: new Date().toISOString(),
      daysSince: daysSince
    };

  } catch (error) {
    console.error('Error processing log file:', error);
    throw error;
  }
}

// Main function
async function main() {
  const daysSince = parseInt(process.argv[2]) || 7;

  try {
    console.log('Starting log processing...');
    console.log(`Fetching visitor data from the last ${daysSince} days`);

    // Download log files
    const logFilePath = await downloadLogFiles();

    // Process the log file
    const visitorData = await processLogFile(logFilePath, daysSince);

    console.log(`\nProcessing complete!`);
    console.log(`Found ${visitorData.totalVisitors} unique visitors from ${visitorData.visitors.length} locations`);
    console.log(`Total visits: ${visitorData.totalVisits}`);

    // Save to public directory for the React app
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(visitorData, null, 2));
    console.log(`Visitor data saved to ${OUTPUT_FILE}`);

    // Display top countries
    const countryCounts = {};
    visitorData.visitors.forEach(visitor => {
      countryCounts[visitor.country] = (countryCounts[visitor.country] || 0) + visitor.visitCount;
    });

    console.log('\nTop countries by visits:');
    Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([country, count]) => {
        console.log(`  ${country}: ${count} visits`);
      });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run main function if this script is executed directly
if (import.meta.url === `file:///${__filename.replace(/\\/g, '/')}`) {
  main();
}

export { downloadLogFiles, processLogFile };
#   T e s t   c o m m e n t   t o   f o r c e   u p d a t e  
 