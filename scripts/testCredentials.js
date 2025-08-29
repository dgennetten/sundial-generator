import dotenv from 'dotenv';

dotenv.config();

console.log('Attempting to load credentials from .env file...');

const host = process.env.FTP_HOST;
const user = process.env.FTP_USER;
const pass = process.env.FTP_PASSWORD;

if (host && user && pass) {
  console.log(`✅ Credentials loaded successfully.`);
  console.log(`   - FTP Host: ${host}`);
  console.log(`   - FTP User: ${user}`);
  console.log(`   - FTP Password: [${'*'.repeat(pass.length)}]`);
} else {
  console.error('❌ Failed to load credentials. Please check the following:');
  console.error('   1. Does the .env file exist in the project root?');
  console.error('   2. Is it formatted correctly (e.g., FTP_HOST=your.host.com)?');
  if (!host) console.error('      - FTP_HOST is missing.');
  if (!user) console.error('      - FTP_USER is missing.');
  if (!pass) console.error('      - FTP_PASSWORD is missing.');
}