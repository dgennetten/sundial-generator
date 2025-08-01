// Script to fetch logs from Dreamhost via SFTP and process visitor data
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SFTP configuration for Dreamhost - loaded from environment variables
const SFTP_CONFIG = {
  host: process.env.SFTP_HOST || 'gennetten.org',
  username: process.env.SFTP_USERNAME || 'dgennetten',
  password: process.env.SFTP_PASSWORD,
  port: parseInt(process.env.SFTP_PORT) || 22
};

const LOG_PATH = process.env.SFTP_LOG_PATH || '/home/_domain_logs/dgennetten/sundial.gennetten.org/https.54243421/';

// Validate required environment variables
if (!SFTP_CONFIG.password) {
  console.error('❌ Error: SFTP_PASSWORD environment variable is required');
  console.log('💡 Please check your .env file and ensure SFTP_PASSWORD is set');
  process.exit(1);
}
const LOCAL_LOG_DIR = path.join(__dirname, '..', 'logs');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'visitor-data.json');

// Ensure local log directory exists
if (!fs.existsSync(LOCAL_LOG_DIR)) {
  fs.mkdirSync(LOCAL_LOG_DIR, { recursive: true });
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
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log('SFTP connection established');
      
      conn.sftp((err, sftp) => {
        if (err) {
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
      reject(err);
    });
    
    conn.connect(SFTP_CONFIG);
  });
}

// Process log file and extract visitor data
async function processLogFile(logFilePath, daysSince = 7) {
  const visitors = new Map(); // Use IP as key to avoid duplicates
  const visitCounts = new Map(); // Track visit counts per location
  const failedIPs = new Set(); // Track IPs that failed geolocation
  
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
      const timestampStr = logEntry.timestamp.replace(/\[|\]/g, '');
      const logDate = new Date(timestampStr.replace(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (.+)/, '$2 $1, $3 $4:$5:$6 $7'));
      
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