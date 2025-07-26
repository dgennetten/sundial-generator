// Simple script to test SFTP connection to Dreamhost
import { Client } from 'ssh2';

const SFTP_CONFIG = {
  host: 'gennetten.org',
  username: 'dgennetten@gennetten.org',
  password: 'td!stayAct1ve',
  port: 22
};

const LOG_PATH = '/home/_domain_logs/dgennetten/sundial.gennetten.org/https.54243421/';

function testConnection() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    console.log('🔌 Testing SFTP connection to Dreamhost...');
    console.log(`📡 Host: ${SFTP_CONFIG.host}`);
    console.log(`👤 User: ${SFTP_CONFIG.username}`);
    
    conn.on('ready', () => {
      console.log('✅ SFTP connection established successfully!');
      
      conn.sftp((err, sftp) => {
        if (err) {
          console.error('❌ SFTP session failed:', err.message);
          reject(err);
          return;
        }
        
        console.log('📂 Checking log directory...');
        
        // List files in the log directory
        sftp.readdir(LOG_PATH, (err, list) => {
          if (err) {
            console.error(`❌ Cannot access log directory ${LOG_PATH}:`, err.message);
            reject(err);
            return;
          }
          
          console.log(`✅ Log directory accessible: ${LOG_PATH}`);
          console.log(`📄 Found ${list.length} files:`);
          
          // Show available files
          list.forEach(file => {
            const sizeKB = Math.round(file.attrs.size / 1024);
            const modDate = new Date(file.attrs.mtime * 1000).toLocaleDateString();
            console.log(`   📄 ${file.filename} (${sizeKB} KB, modified: ${modDate})`);
          });
          
          // Find access logs
          const accessLogs = list.filter(file => 
            file.filename.includes('access.log') && 
            !file.filename.includes('.gz')
          );
          
          if (accessLogs.length > 0) {
            console.log(`\n🎯 Found ${accessLogs.length} access log file(s):`);
            accessLogs.forEach(log => {
              const sizeKB = Math.round(log.attrs.size / 1024);
              console.log(`   ✅ ${log.filename} (${sizeKB} KB)`);
            });
          } else {
            console.log('\n⚠️  No uncompressed access.log files found');
            console.log('   Check if logs exist or are compressed (.gz)');
          }
          
          conn.end();
          resolve(true);
        });
      });
    });
    
    conn.on('error', (err) => {
      console.error('❌ Connection failed:', err.message);
      
      if (err.code === 'ENOTFOUND') {
        console.log('💡 Possible solutions:');
        console.log('   - Check your internet connection');
        console.log('   - Verify the hostname is correct');
      } else if (err.code === 'ECONNREFUSED') {
        console.log('💡 Possible solutions:');
        console.log('   - Check if SFTP is enabled on your Dreamhost account');
        console.log('   - Verify the port number (22 for SFTP)');
      } else if (err.message.includes('authentication')) {
        console.log('💡 Possible solutions:');
        console.log('   - Check your username and password');
        console.log('   - Verify SFTP access is enabled for your user');
      }
      
      reject(err);
    });
    
    console.log('🔄 Connecting...');
    conn.connect(SFTP_CONFIG);
  });
}

// Main function
async function main() {
  try {
    await testConnection();
    console.log('\n🎉 Connection test successful!');
    console.log('💡 You can now run: npm run update-visitors');
  } catch (error) {
    console.log('\n💥 Connection test failed');
    console.log('🔧 Please check your settings and try again');
    process.exit(1);
  }
}

main();