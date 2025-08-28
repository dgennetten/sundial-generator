// Script to update visitor data and optionally deploy
import { downloadLogFiles, processLogFile } from './fetchLogs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'visitor-data.json');

async function updateVisitorData(daysSince = 7) {
  try {
    console.log('🌍 Starting visitor data update...');
    console.log(`📅 Fetching data from the last ${daysSince} days`);
    
    // Step 1: Download log files
    console.log('📥 Downloading log files from Dreamhost...');
    const logFilePath = await downloadLogFiles();
    
    // Step 2: Process the log file
    console.log('🔍 Processing log entries...');
    const visitorData = await processLogFile(logFilePath, daysSince);
    
    // Step 3: Save the data
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(visitorData, null, 2));
    
    console.log('✅ Visitor data update complete!');
    console.log(`📊 Found ${visitorData.totalVisitors} unique visitors`);
    console.log(`🎯 Total visits: ${visitorData.totalVisits}`);
    console.log(`💾 Data saved to: ${OUTPUT_FILE}`);
    
    // Display top countries
    const countryCounts = {};
    visitorData.visitors.forEach(visitor => {
      countryCounts[visitor.country] = (countryCounts[visitor.country] || 0) + visitor.visitCount;
    });
    
    console.log('\n🌎 Top countries by visits:');
    Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([country, count]) => {
        console.log(`   ${country}: ${count} visits`);
      });
    
    return visitorData;
    
  } catch (error) {
    console.error('❌ Error updating visitor data:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  const daysSince = parseInt(process.argv[2]) || 7;
  const shouldBuild = process.argv.includes('--build');
  
  try {
    // Update visitor data
    await updateVisitorData(daysSince);
    
    // Optionally build the project
    if (shouldBuild) {
      console.log('\n🔨 Building project...');
      const { execSync } = await import('child_process');
      execSync('npm run build', { stdio: 'inherit' });
      
      // Ensure visitor data is copied to dist folder after build
      console.log('📋 Copying visitor data to dist folder...');
      const fs = await import('fs');
      const distVisitorDataPath = path.join(__dirname, '..', 'dist', 'visitor-data.json');
      fs.copyFileSync(OUTPUT_FILE, distVisitorDataPath);
      console.log('✅ Build complete and visitor data copied!');
    }
    
    console.log('\n🎉 All done! Your visitor map should now show updated data.');
    
  } catch (error) {
    console.error('💥 Update failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { updateVisitorData };