// Log parser for Dreamhost access logs (ESM) - Fast local geolocation
// Parses access logs and extracts visitor geographic data

import fs from 'fs';
import { getLocationFromIP, COUNTRY_LOCATIONS } from './geoipLocal.js';

// Convert Apache log timestamp to a JS Date
function parseLogTimestamp(timestamp) {
  // Example: 08/Sep/2025:02:55:14 -0700 -> Sep 08, 2025 02:55:14 -0700
  const normalized = timestamp.replace(
    /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (.+)/,
    '$2 $1, $3 $4:$5:$6 $7'
  );
  return new Date(normalized);
}

// Fast local IP geolocation (no API calls, no rate limiting needed)
export { getLocationFromIP } from './geoipLocal.js';

// Optional IPv6-only API fallback (enabled via env IPV6_API_LOOKUP=true)
// Read flag at call-time to avoid import-order issues (dotenv/.env)
const isIPv6Enabled = () => String(process.env.IPV6_API_LOOKUP || '').toLowerCase() === 'true';
const ipv6Cache = new Map(); // cache per-run to avoid duplicate lookups

function isIPv6(ip) {
  return typeof ip === 'string' && ip.includes(':');
}

async function fetchIPv6Geo(ip) {
  try {
    const url = `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,message`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'success') return null;

    const country = data.country || (data.countryCode && COUNTRY_LOCATIONS[data.countryCode]?.country) || 'Unknown';
    const countryCode = data.countryCode || 'UN';
    const region = data.regionName || data.region || COUNTRY_LOCATIONS[countryCode]?.region || '';
    const city = data.city || COUNTRY_LOCATIONS[countryCode]?.city || '';
    const lat = typeof data.lat === 'number' ? data.lat : (COUNTRY_LOCATIONS[countryCode]?.lat ?? 0);
    const lon = typeof data.lon === 'number' ? data.lon : (COUNTRY_LOCATIONS[countryCode]?.lon ?? 0);
    const timezone = data.timezone || 'UTC';

    return { ip, country, countryCode, region, city, lat, lon, timezone };
  } catch {
    return null;
  }
}

async function getLocationForIP(ip) {
  // Try fast local (IPv4 only)
  const local = getLocationFromIP(ip);
  if (local) return local;

  // IPv6 fallback via API if enabled
  if (isIPv6Enabled() && isIPv6(ip)) {
    if (ipv6Cache.has(ip)) return ipv6Cache.get(ip);
    const result = await fetchIPv6Geo(ip);
    if (result) ipv6Cache.set(ip, result);
    return result;
  }

  return null;
}

// Parse Apache/Nginx access log line
export function parseLogLine(line) {
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

// Process log file and extract visitor data (fast local geolocation)
export async function processLogFile(logFilePath, startDate = null) {
  const visitors = new Map(); // Use IP as key to avoid duplicates
  const ipVisitCounts = new Map(); // Track visit counts per IP

  try {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');

    console.log(`Processing ${lines.length} log lines using fast local geolocation...`);

    let processedIPs = 0;
    const totalIPs = new Set();

    // First pass: count unique IPs and visits per IP
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const logEntry = parseLogLine(line);
      if (!logEntry) continue;

      if (startDate) {
        const logDate = parseLogTimestamp(logEntry.timestamp);
        if (isNaN(logDate.getTime()) || logDate < startDate) continue;
      }

      totalIPs.add(logEntry.ip);
      // Count actual visits per IP
      ipVisitCounts.set(logEntry.ip, (ipVisitCounts.get(logEntry.ip) || 0) + 1);
    }

    console.log(`Found ${totalIPs.size} unique IPs to process`);
    console.log(`Estimated processing time: ~${Math.ceil(totalIPs.size * 0.01)} seconds (local lookup)`);

    // Second pass: process unique IPs and get their locations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const logEntry = parseLogLine(line);
      if (!logEntry) continue;

      // Filter by date if specified
      if (startDate) {
        const logDate = parseLogTimestamp(logEntry.timestamp);
        if (isNaN(logDate.getTime()) || logDate < startDate) continue;
      }

      // Skip if we already processed this IP
      if (visitors.has(logEntry.ip)) {
        // Update last visit time if this is a later entry
        const existingVisitor = visitors.get(logEntry.ip);
        const currentLogDate = parseLogTimestamp(logEntry.timestamp);
        const existingLogDate = parseLogTimestamp(existingVisitor.lastVisit);
        if (currentLogDate > existingLogDate) {
          existingVisitor.lastVisit = logEntry.timestamp;
        }
        continue;
      }

      // Get geolocation for new IP (IPv4 local, IPv6 optional API fallback)
      const location = await getLocationForIP(logEntry.ip);
      if (location) {
        visitors.set(logEntry.ip, {
          ...location,
          firstVisit: logEntry.timestamp,
          lastVisit: logEntry.timestamp,
          visitCount: ipVisitCounts.get(logEntry.ip) || 1
        });

        processedIPs++;
        if (processedIPs % 100 === 0) {
          console.log(`Progress: ${processedIPs}/${totalIPs.size} IPs processed (${Math.round(processedIPs/totalIPs.size*100)}%)`);
        }
      }
    }

    // Convert to array
    const visitorData = Array.from(visitors.values());
    
    const totalVisits = visitorData.reduce((sum, visitor) => sum + visitor.visitCount, 0);

    console.log(`✅ Processing complete! Found ${visitorData.length} unique visitors with ${totalVisits} total visits`);

    return {
      visitors: visitorData,
      totalVisitors: visitorData.length,
      totalVisits: totalVisits,
      processedDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing log file:', error);
    throw error;
  }
}

export function saveVisitorData(data, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Visitor data saved to ${outputPath}`);
}

// Optional: allow running directly for debugging
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  (async () => {
    const logFilePath = process.argv[2];
    const outputPath = process.argv[3] || './visitor-data.json';
    const daysSince = parseInt(process.argv[4]) || null;

    if (!logFilePath) {
      console.log('Usage: node logParser.js <log-file-path> [output-path] [days-since]');
      process.exit(1);
    }

    let startDate = null;
    if (daysSince) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysSince);
      console.log(`Processing visits since: ${startDate.toISOString()}`);
    }

    const visitorData = await processLogFile(logFilePath, startDate);
    saveVisitorData(visitorData, outputPath);
  })();
}

export default { processLogFile, parseLogLine, getLocationFromIP };
