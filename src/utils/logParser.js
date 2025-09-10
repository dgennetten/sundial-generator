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

// Rate limiting for IP geolocation API
let lastApiCall = 0;
const API_RATE_LIMIT = 1000; // 1 second between requests (safe for free tier)

// Simple IP geolocation using a free service with rate limiting
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

    // Skip other private IP ranges
    if (ip.startsWith('172.')) {
      const secondOctet = parseInt(ip.split('.')[1]);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return null;
      }
    }

    // Skip other reserved ranges
    if (ip.startsWith('169.254.') || ip.startsWith('224.') || ip.startsWith('240.')) {
      return null;
    }

    // Rate limiting: wait if needed
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    if (timeSinceLastCall < API_RATE_LIMIT) {
      const waitTime = API_RATE_LIMIT - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${waitTime}ms before API call for IP ${ip}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastApiCall = Date.now();

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query`
    );

    // Handle rate limiting (429) with exponential backoff
    if (response.status === 429) {
      console.log(`Rate limited (429) for IP ${ip}, waiting before retry...`);

      // Exponential backoff: wait 5 seconds, then retry once
      await new Promise(resolve => setTimeout(resolve, 5000));

      lastApiCall = Date.now();
      const retryResponse = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,query`
      );

      if (!retryResponse.ok) {
        console.log(`Retry failed with ${retryResponse.status} for IP ${ip}`);
        return null;
      }

      // Use retry response for further processing
      const responseText = await retryResponse.text();
      if (!responseText || responseText.trim() === '') {
        console.log(`Empty retry response for IP ${ip}`);
        return null;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error(`Invalid JSON in retry response for IP ${ip}:`, responseText.substring(0, 100));
        return null;
      }

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

      console.log(`Retry returned status "${data.status}" for IP ${ip}`);
      return null;
    }

    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      console.log(`API returned ${response.status} for IP ${ip}`);
      return null;
    }

    // Get response text first to check if it's empty
    const responseText = await response.text();

    if (!responseText || responseText.trim() === '') {
      console.log(`Empty response from API for IP ${ip}`);
      return null;
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error(`Invalid JSON response for IP ${ip}:`, responseText.substring(0, 100));
      return null;
    }

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
      console.log(`API returned status "${data.status}" for IP ${ip}`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting location for IP ${ip}:`, error.message);
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
    console.log(`Note: Rate limiting applied (1 second between API calls)`);

    let processedIPs = 0;
    const totalIPs = new Set();

    // First pass: count unique IPs to estimate processing time
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
    console.log(`Estimated processing time: ~${Math.ceil(totalIPs.size * 1.1)} seconds`);

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

        processedIPs++;
        if (processedIPs % 5 === 0) {
          console.log(`Progress: ${processedIPs}/${totalIPs.size} IPs processed (${Math.round(processedIPs/totalIPs.size*100)}%)`);
        }
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