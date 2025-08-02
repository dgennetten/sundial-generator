// Simple Visitor Data Generator for DreamHost
// This script creates visitor data that can be consumed by your built dist

const fs = require('fs');
const path = require('path');

// Function to generate sample visitor data
function generateVisitorData() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  // Sample visitor data (you can customize this)
  const visitorData = {
    visitors: [
      {
        ip: '192.168.1.100',
        country: 'United States',
        countryCode: 'US',
        region: 'Colorado',
        city: 'Denver',
        lat: 39.7392,
        lon: -104.9903,
        timezone: 'America/Denver',
        firstVisit: sevenDaysAgo.toISOString(),
        lastVisit: now.toISOString(),
        visitCount: 15
      },
      {
        ip: '203.0.113.50',
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'Brea',
        lat: 33.9167,
        lon: -117.9000,
        timezone: 'America/Los_Angeles',
        firstVisit: new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString(),
        lastVisit: now.toISOString(),
        visitCount: 8
      },
      {
        ip: '198.51.100.25',
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'Santa Clara',
        lat: 37.3541,
        lon: -121.9552,
        timezone: 'America/Los_Angeles',
        firstVisit: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString(),
        lastVisit: now.toISOString(),
        visitCount: 2
      }
    ],
    totalVisitors: 3,
    totalVisits: 25,
    processedDate: now.toISOString(),
    daysSince: 7
  };

  return visitorData;
}

// Function to update visitor data
async function updateVisitorData() {
  try {
    console.log('Starting visitor data update...');
    
    // Generate visitor data
    const visitorData = generateVisitorData();
    
    // Write to visitor-data.json in the current directory
    const outputPath = path.join(process.cwd(), 'visitor-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(visitorData, null, 2));
    
    console.log('Visitor data updated successfully');
    console.log(`Total visitors: ${visitorData.totalVisitors}`);
    console.log(`Total visits: ${visitorData.totalVisits}`);
    console.log(`Output file: ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error('Error updating visitor data:', error);
    return false;
  }
}

// Run the update
updateVisitorData().then(success => {
  process.exit(success ? 0 : 1);
}); 