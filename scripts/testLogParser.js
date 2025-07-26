// Test script to verify log parsing functionality
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample log entries for testing
const sampleLogEntries = [
  '192.168.1.100 - - [15/Jan/2024:10:30:45 -0700] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
  '203.0.113.50 - - [15/Jan/2024:11:15:22 -0700] "GET /sundial HTTP/1.1" 200 5678 "https://google.com" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"',
  '198.51.100.25 - - [15/Jan/2024:12:45:33 -0700] "GET /about HTTP/1.1" 200 2345 "-" "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"',
  '192.168.1.100 - - [15/Jan/2024:13:20:15 -0700] "GET /contact HTTP/1.1" 200 3456 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
  '203.0.113.50 - - [15/Jan/2024:14:05:44 -0700] "GET /style.css HTTP/1.1" 200 789 "https://sundial.gennetten.org/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"',
];

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

// Test the log parsing
function testLogParsing() {
  console.log('Testing log parsing functionality...\n');
  
  sampleLogEntries.forEach((line, index) => {
    console.log(`Entry ${index + 1}:`);
    console.log(`Raw: ${line}`);
    
    const parsed = parseLogLine(line);
    if (parsed) {
      console.log(`Parsed:`, {
        ip: parsed.ip,
        timestamp: parsed.timestamp,
        method: parsed.method,
        path: parsed.path,
        status: parsed.status
      });
    } else {
      console.log('Failed to parse');
    }
    console.log('---');
  });
}

// Create a sample log file for testing
function createSampleLogFile() {
  const logDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'sample-access.log');
  const logContent = sampleLogEntries.join('\n') + '\n';
  
  fs.writeFileSync(logFile, logContent);
  console.log(`Sample log file created: ${logFile}`);
  return logFile;
}

// Test geolocation API (without making actual requests)
function testGeolocationAPI() {
  console.log('\nTesting geolocation API format...\n');
  
  const sampleIPs = ['8.8.8.8', '1.1.1.1', '192.168.1.1'];
  
  sampleIPs.forEach(ip => {
    console.log(`IP: ${ip}`);
    
    // Skip local/private IPs
    if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
      console.log('  -> Skipped (private/local IP)');
    } else {
      console.log(`  -> Would query: http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query`);
    }
    console.log('---');
  });
}

// Main test function
function main() {
  console.log('=== Log Parser Test Suite ===\n');
  
  // Test 1: Log parsing
  testLogParsing();
  
  // Test 2: Create sample log file
  const sampleLogFile = createSampleLogFile();
  
  // Test 3: Geolocation API format
  testGeolocationAPI();
  
  console.log('\n=== Test Complete ===');
  console.log(`\nTo test with real data:`);
  console.log(`1. Run: npm run fetch-logs`);
  console.log(`2. Or manually: node scripts/fetchLogs.js`);
  console.log(`3. Check the visitor map in your React app at http://localhost:5173`);
  
  console.log(`\nSample log file created at: ${sampleLogFile}`);
  console.log(`You can test the parser with: node src/utils/logParser.js "${sampleLogFile}" ./public/visitor-data-test.json`);
}

main();