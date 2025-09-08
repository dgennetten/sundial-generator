// Script to update visitor data and optionally deploy
import { downloadLogFiles, processLogFile } from './fetchLogs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'visitor-data.json');

async function updateVisitorData(daysSince = 7) {
  try {
    console.log('🌍 Starting visitor data update...');
    console.log(`📅 Fetching data from the last ${daysSince} days`);
    console.log(`🔧 Environment check:`);
    console.log(`   SFTP_HOST: ${process.env.SFTP_HOST ? '✅ Set' : '❌ Missing'}`);
    console.log(`   SFTP_USERNAME: ${process.env.SFTP_USERNAME ? '✅ Set' : '❌ Missing'}`);
    console.log(`   SFTP_PASSWORD: ${process.env.SFTP_PASSWORD ? '✅ Set' : '❌ Missing'}`);
    console.log(`   SFTP_LOG_PATH: ${process.env.SFTP_LOG_PATH ? '✅ Set' : '❌ Missing'}`);

    // Step 1: Download log files (include rotated .gz and merge for the last N days)
    console.log('📥 Downloading log files from Dreamhost...');
    const logFilePath = await downloadLogFiles(daysSince);
    
    // Step 2: Process the log file
    console.log('🔍 Processing log entries...');
    console.log(`📁 Processing log file: ${logFilePath}`);
    const visitorData = await processLogFile(logFilePath, daysSince);

    // Step 3: Save the data
    console.log('💾 Saving visitor data...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(visitorData, null, 2));

    console.log('✅ Visitor data update complete!');
    console.log(`📊 Found ${visitorData.totalVisitors} unique visitors`);
    console.log(`🎯 Total visits: ${visitorData.totalVisits}`);
    console.log(`💾 Data saved to: ${OUTPUT_FILE}`);
    console.log(`📄 File size: ${fs.statSync(OUTPUT_FILE).size} bytes`);
    
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

  console.log('🚀 Starting visitor data update script...');
  console.log(`📅 Days since: ${daysSince}`);
  console.log(`🔧 Build flag: ${shouldBuild}`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  console.log(`📂 Script directory: ${__dirname}`);

  try {
    // Update visitor data
    await updateVisitorData(daysSince);
    
    // Optionally build the project
    if (shouldBuild) {
      console.log('\n🔨 Building project with updated visitor data...');
      try {
        execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        console.log('✅ Build completed successfully!');
      } catch (buildError) {
        console.error('❌ Build failed:', buildError.message);
        throw buildError;
      }
    }
    
    console.log('\n🎉 All done! Your visitor map should now show updated data.');

  } catch (error) {
    console.error('💥 Update failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Catch any unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Catch any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { updateVisitorData };