import ftp from 'ftp';
import dotenv from 'dotenv';

// Load environment variables from .env file (if it exists)
dotenv.config();

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remotePath: 'sundial.gennetten.org'
};

console.log('🧪 Testing FTP connection...');
console.log(`📡 Host: ${config.host}`);
console.log(`👤 User: ${config.user}`);
console.log(`🔑 Password: ${config.password ? '[SET]' : '[MISSING]'}`);

// Validate that all required environment variables are present
if (!config.host || !config.user || !config.password) {
  console.error('❌ Missing required FTP credentials:');
  console.error(`   FTP_HOST: ${config.host ? '✅ Set' : '❌ Missing'}`);
  console.error(`   FTP_USER: ${config.user ? '✅ Set' : '❌ Missing'}`);
  console.error(`   FTP_PASSWORD: ${config.password ? '✅ Set' : '❌ Missing'}`);
  process.exit(1);
}

const c = new ftp();

c.on('ready', () => {
  console.log('✅ FTP connection successful!');
  
  // Test listing the remote directory
  c.list(config.remotePath, (err, list) => {
    if (err) {
      console.error('❌ Failed to list remote directory:', err.message);
      c.end();
      process.exit(1);
    }
    
    console.log(`📁 Successfully listed ${config.remotePath}:`);
    list.forEach(item => {
      console.log(`   ${item.type === 'd' ? '📁' : '📄'} ${item.name}`);
    });
    
    console.log('🎉 FTP connection test completed successfully!');
    c.end();
  });
});

c.on('error', (err) => {
  console.error('❌ FTP connection error:', err.message);
  console.error('This usually indicates:');
  console.error('  - Incorrect FTP credentials');
  console.error('  - Network connectivity issues');
  console.error('  - FTP server is down or unreachable');
  process.exit(1);
});

c.on('close', (hadError) => {
  if (hadError) {
    console.error('❌ FTP connection closed due to error');
    process.exit(1);
  } else {
    console.log('📡 FTP connection closed successfully');
  }
});

c.connect(config);