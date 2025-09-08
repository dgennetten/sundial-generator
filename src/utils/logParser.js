// Log parser for Dreamhost access logs (ESM)
// Parses access logs and extracts visitor geographic data

import fs from 'fs';

// Convert Apache log timestamp to a JS Date
function parseLogTimestamp(timestamp) {
  // Example: 08/Sep/2025:02:55:14 -0700 -> Sep 08, 2025 02:55:14 -0700
  const normalized = timestamp.replace(
    /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (.+)/,
    '$2 $1, $3 $4:$5:$6 $7'
  );
  return new Date(normalized);
}

// Simple IP geolocation using a free service
export async function getLocationFromIP(ip) {
  try {
    // Skip local/private IPs
    if (
      ip.startsWith('127.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip === '::1'
    ) {
      return null;
    }

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query`
    );
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

// Process log file and extract visitor data
export async function processLogFile(logFilePath, startDate = null) {
  const visitors = new Map(); // Use IP as key to avoid duplicates
  const visitCounts = new Map(); // Track visit counts per location

  try {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');

    console.log(`Processing ${lines.length} log lines...`);

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
        const locationKey = `${visitors.get(logEntry.ip).lat},${visitors.get(logEntry.ip).lon}`;
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
      }

      // Add tiny delay to respect rate limits
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
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