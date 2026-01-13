import dotenv from 'dotenv';

// Load environment variables the same way deploy-sftp.js does
dotenv.config();
dotenv.config({ path: '.env.local' });

console.log('Checking environment variables...\n');

const vars = {
  'SFTP_HOST': process.env.SFTP_HOST || process.env.FTP_HOST,
  'SFTP_USERNAME': process.env.SFTP_USERNAME || process.env.FTP_USER,
  'SFTP_PASSWORD': process.env.SFTP_PASSWORD || process.env.FTP_PASSWORD,
};

console.log('Found variables:');
console.log(`  SFTP_HOST: ${vars.SFTP_HOST ? '✅ ' + vars.SFTP_HOST : '❌ Missing'}`);
console.log(`  SFTP_USERNAME: ${vars.SFTP_USERNAME ? '✅ ' + vars.SFTP_USERNAME : '❌ Missing'}`);
console.log(`  SFTP_PASSWORD: ${vars.SFTP_PASSWORD ? '✅ [REDACTED - ' + vars.SFTP_PASSWORD.length + ' chars]' : '❌ Missing'}`);

console.log('\nAll environment variables (for debugging):');
console.log('  SFTP_HOST:', process.env.SFTP_HOST || '(not set)');
console.log('  FTP_HOST:', process.env.FTP_HOST || '(not set)');
console.log('  SFTP_USERNAME:', process.env.SFTP_USERNAME || '(not set)');
console.log('  FTP_USER:', process.env.FTP_USER || '(not set)');
console.log('  SFTP_PASSWORD:', process.env.SFTP_PASSWORD ? '[REDACTED]' : '(not set)');
console.log('  FTP_PASSWORD:', process.env.FTP_PASSWORD ? '[REDACTED]' : '(not set)');
