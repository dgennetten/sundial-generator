// Script to update SFTP credentials in .env file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

const ENV_FILE = path.join(__dirname, '..', '.env');

function updateEnvFile(newConfig) {
  try {
    let content = fs.readFileSync(ENV_FILE, 'utf8');
    
    // Update each credential
    content = content.replace(/SFTP_HOST=.*/, `SFTP_HOST=${newConfig.host}`);
    content = content.replace(/SFTP_USERNAME=.*/, `SFTP_USERNAME=${newConfig.username}`);
    content = content.replace(/SFTP_PASSWORD=.*/, `SFTP_PASSWORD=${newConfig.password}`);
    content = content.replace(/SFTP_PORT=.*/, `SFTP_PORT=${newConfig.port}`);
    
    // Also update FTP credentials if they should match
    if (newConfig.updateFtp) {
      content = content.replace(/FTP_HOST=.*/, `FTP_HOST=${newConfig.host}`);
      content = content.replace(/FTP_USERNAME=.*/, `FTP_USERNAME=${newConfig.ftpUsername}`);
      content = content.replace(/FTP_PASSWORD=.*/, `FTP_PASSWORD=${newConfig.password}`);
    }
    
    fs.writeFileSync(ENV_FILE, content);
    console.log(`✅ Updated: .env file`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating .env file:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 SFTP Credentials Update Tool');
  console.log('=================================\n');
  
  console.log('This will update credentials in your .env file');
  
  console.log('\n📝 Enter new credentials:');
  
  const host = await question('SFTP Host (gennetten.org): ') || 'gennetten.org';
  const username = await question('SFTP Username (dgennetten): ') || 'dgennetten';
  const password = await question('SFTP Password: ');
  const port = await question('SFTP Port (22): ') || '22';
  
  if (!password) {
    console.log('❌ Password is required');
    rl.close();
    return;
  }
  
  const updateFtp = await question('\nAlso update FTP credentials for deployment? (y/n): ');
  let ftpUsername = username;
  
  if (updateFtp.toLowerCase() === 'y') {
    ftpUsername = await question('FTP Username (dgennetten): ') || 'dgennetten';
  }
  
  const newConfig = {
    host,
    username,
    password,
    port: parseInt(port),
    updateFtp: updateFtp.toLowerCase() === 'y',
    ftpUsername
  };
  
  console.log('\n🔍 New configuration:');
  console.log(`SFTP Host: ${newConfig.host}`);
  console.log(`SFTP Username: ${newConfig.username}`);
  console.log(`SFTP Password: ${'*'.repeat(newConfig.password.length)}`);
  console.log(`SFTP Port: ${newConfig.port}`);
  if (newConfig.updateFtp) {
    console.log(`FTP Username: ${newConfig.ftpUsername}`);
    console.log(`FTP Password: ${'*'.repeat(newConfig.password.length)}`);
  }
  
  const confirm = await question('\nUpdate .env file with these credentials? (y/n): ');
  
  if (confirm.toLowerCase() === 'y') {
    console.log('\n🔄 Updating .env file...');
    
    if (updateEnvFile(newConfig)) {
      console.log('\n🎉 Credentials updated successfully!');
      console.log('\n🧪 Test the new credentials with:');
      console.log('   npm run test-connection');
      console.log('\n📥 Then try fetching logs with:');
      console.log('   npm run fetch-logs');
    } else {
      console.log('\n❌ Failed to update credentials');
    }
  } else {
    console.log('❌ Update cancelled');
  }
  
  rl.close();
}

main().catch(console.error);