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

// Simple IP geolocation using a free service
async function getLocationFromIP(ip) {
  try {
    // Skip local/private IPs
    if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
      return null;
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query`);
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
    }
  } catch (error) {
    console.error(`Error getting location for IP ${ip}:`, error);
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
async function processLogFile(logFilePath, daysSince = 30) {
  const visitors = new Map(); // Use IP as key to avoid duplicates
  const visitCounts = new Map(); // Track visit counts per location
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysSince);
  
  try {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');
    
    console.log(`Processing ${lines.length} log lines from the last ${daysSince} days...`);
    
    let processedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const logEntry = parseLogLine(line);
      if (!logEntry) continue;
      
      // Parse timestamp and filter by date
      const timestampStr = logEntry.timestamp.replace(/\[|\]/g, '');
      const logDate = new Date(timestampStr.replace(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (.+)/, '$2 $1, $3 $4:$5:$6 $7'));
      
      if (logDate < startDate) continue;
      
      // Skip non-HTML requests (images, CSS, JS, etc.)
      if (logEntry.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i)) {
        continue;
      }
      
      // Skip if we already processed this IP
      if (visitors.has(logEntry.ip)) {
        const visitor = visitors.get(logEntry.ip);
        visitor.lastVisit = logEntry.timestamp;
        const locationKey = `${visitor.lat},${visitor.lon}`;
        visitCounts.set(locationKey, (visitCounts.get(locationKey) || 0) + 1);
        continue;
      }
      
      // Get geolocation for new IP
      const location = await getLocationFromIP(logEntry.ip);
      if (location) {
        visitors.set(logEntry.ip, {
          ...location,
          firstVisit: logEntry.timestamp,
          lastVisit: logEntry.timestamp
        });
        
        const locationKey = `${location.lat},${location.lon}`;
        visitCounts.set(locationKey, (visitCounts.get(locationKey) || 0) + 1);
        
        processedCount++;
        console.log(`Processed visitor ${processedCount}: ${location.city}, ${location.country}`);
      }
      
      // Add delay to respect rate limits (ip-api.com allows 45 requests per minute)
      if (processedCount % 10 === 0) {
        console.log(`Processed ${processedCount} unique visitors, pausing...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Convert to array and add visit counts
    const visitorData = Array.from(visitors.values()).map(visitor => {
      const locationKey = `${visitor.lat},${visitor.lon}`;
      return {
        ...visitor,
        visitCount: visitCounts.get(locationKey) || 1
      };
    });
    
    return {
      visitors: visitorData,
      totalVisitors: visitorData.length,
      totalVisits: Array.from(visitCounts.values()).reduce((sum, count) => sum + count, 0),
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
  const daysSince = parseInt(process.argv[2]) || 30;
  
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