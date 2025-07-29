// Debug script to analyze log processing without making API calls
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function isPrivateIP(ip) {
  if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
    return true;
  }
  
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }
  
  if (ip.startsWith('169.254.') || ip.startsWith('224.') || ip.startsWith('240.')) {
    return true;
  }
  
  return false;
}

async function debugLogProcessing(daysSince = 90) {
  const logFilePath = path.join(__dirname, '..', 'logs', 'access.log');
  
  if (!fs.existsSync(logFilePath)) {
    console.error('❌ Log file not found:', logFilePath);
    console.log('💡 Run the fetchLogs script first to download log files');
    return;
  }
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysSince);
  
  console.log(`🔍 Analyzing log file: ${logFilePath}`);
  console.log(`📅 Date filter: ${startDate.toISOString()}`);
  
  const logContent = fs.readFileSync(logFilePath, 'utf8');
  const lines = logContent.split('\n');
  
  const uniqueIPs = new Set();
  const ipCounts = new Map();
  let totalEntries = 0;
  let validEntries = 0;
  let oldEntries = 0;
  let staticFileRequests = 0;
  let privateIPs = 0;
  let uniquePublicIPs = new Set();
  
  console.log(`\n📊 Processing ${lines.length} log lines...`);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const logEntry = parseLogLine(line);
    if (!logEntry) continue;
    
    totalEntries++;
    
    // Parse timestamp
    const timestampStr = logEntry.timestamp.replace(/\[|\]/g, '');
    const logDate = new Date(timestampStr.replace(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (.+)/, '$2 $1, $3 $4:$5:$6 $7'));
    
    if (logDate < startDate) {
      oldEntries++;
      continue;
    }
    
    // Check for static files
    if (logEntry.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i)) {
      staticFileRequests++;
      continue;
    }
    
    validEntries++;
    uniqueIPs.add(logEntry.ip);
    ipCounts.set(logEntry.ip, (ipCounts.get(logEntry.ip) || 0) + 1);
    
    // Check if IP is private
    if (isPrivateIP(logEntry.ip)) {
      privateIPs++;
    } else {
      uniquePublicIPs.add(logEntry.ip);
    }
  }
  
  console.log('\n📈 Analysis Results:');
  console.log(`Total log entries: ${totalEntries}`);
  console.log(`Valid entries (within date range, not static files): ${validEntries}`);
  console.log(`Skipped (too old): ${oldEntries}`);
  console.log(`Skipped (static files): ${staticFileRequests}`);
  console.log(`Unique IPs total: ${uniqueIPs.size}`);
  console.log(`Private IPs: ${privateIPs}`);
  console.log(`Unique public IPs (candidates for geolocation): ${uniquePublicIPs.size}`);
  
  // Show top IPs by request count
  console.log('\n🔝 Top 10 IPs by request count:');
  const sortedIPs = Array.from(ipCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  sortedIPs.forEach(([ip, count]) => {
    const isPrivate = isPrivateIP(ip) ? ' (private)' : ' (public)';
    console.log(`   ${ip}: ${count} requests${isPrivate}`);
  });
  
  // Show sample of unique public IPs
  console.log('\n🌍 Sample of unique public IPs (first 20):');
  Array.from(uniquePublicIPs).slice(0, 20).forEach(ip => {
    console.log(`   ${ip}`);
  });
  
  console.log(`\n💡 Expected visitors after geolocation: ~${uniquePublicIPs.size}`);
  console.log('   (Some may fail due to geolocation API issues)');
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const daysSince = parseInt(process.argv[2]) || 90;
  debugLogProcessing(daysSince);
}

export { debugLogProcessing };