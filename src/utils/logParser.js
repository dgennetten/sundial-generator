// Log parser for Dreamhost access logs (ESM) - Fast local geolocation
// Parses access logs and extracts visitor geographic data

import fs from 'fs';
import { getLocationFromIP } from './geoipLocal.js';

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
  const visitCounts = new Map(); // Track visit counts per location

  try {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');

    console.log(`Processing ${lines.length} log lines using fast local geolocation...`);

    let processedIPs = 0;
    const totalIPs = new Set();

    // First pass: count unique IPs
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
    }

    console.log(`Found ${totalIPs.size} unique IPs to process`);
    console.log(`Estimated processing time: ~${Math.ceil(totalIPs.size * 0.01)} seconds (local lookup)`);

    // Second pass: process all entries
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
        const visitor = visitors.get(logEntry.ip);
        const locationKey = `${visitor.lat},${visitor.lon}`;
        visitCounts.set(locationKey, (visitCounts.get(locationKey) || 0) + 1);
        continue;
      }

      // Get geolocation for new IP (fast local lookup)
      const location = getLocationFromIP(logEntry.ip);
      if (location) {
        visitors.set(logEntry.ip, {
          ...location,
          firstVisit: logEntry.timestamp,
          lastVisit: logEntry.timestamp
        });

        const locationKey = `${location.lat},${location.lon}`;
        visitCounts.set(locationKey, (visitCounts.get(locationKey) || 0) + 1);

        processedIPs++;
        if (processedIPs % 100 === 0) {
          console.log(`Progress: ${processedIPs}/${totalIPs.size} IPs processed (${Math.round(processedIPs/totalIPs.size*100)}%)`);
        }
      }
    }

    // Convert to array and add visit counts
    const visitorData = Array.from(visitors.values()).map((visitor) => {
      const locationKey = `${visitor.lat},${visitor.lon}`;
      return {
        ...visitor,
        visitCount: visitCounts.get(locationKey) || 1
      };
    });

    console.log(`✅ Processing complete! Found ${visitorData.length} unique visitors with ${Array.from(visitCounts.values()).reduce((sum, count) => sum + count, 0)} total visits`);

    return {
      visitors: visitorData,
      totalVisitors: visitorData.length,
      totalVisits: Array.from(visitCounts.values()).reduce((sum, count) => sum + count, 0),
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
