import dotenv from 'dotenv';
import fs from 'fs';

console.log('Checking .env.local file...\n');

// Check if file exists
if (!fs.existsSync('.env.local')) {
  console.log('❌ .env.local file does not exist!');
  process.exit(1);
}

console.log('✅ .env.local file exists\n');

// Read file directly
const fileContent = fs.readFileSync('.env.local', 'utf8');
const lines = fileContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

console.log('Non-comment lines found:');
lines.forEach((line, i) => {
  console.log(`  ${i + 1}: ${line}`);
});

console.log('\n--- Loading with dotenv ---\n');

// Load environment variables
const result = dotenv.config({ path: '.env.local', override: true });
console.log('dotenv.config result:', result);

console.log('\n--- Checking process.env ---\n');
console.log('SFTP_HOST:', process.env.SFTP_HOST || '(not set)');
console.log('SFTP_USERNAME:', process.env.SFTP_USERNAME || '(not set)');
console.log('SFTP_PASSWORD:', process.env.SFTP_PASSWORD ? '[REDACTED]' : '(not set)');
