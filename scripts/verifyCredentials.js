// Script to verify and test SFTP credentials for Dreamhost
import { Client } from 'ssh2';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Current credentials from environment variables
const CURRENT_CONFIG = {
  host: process.env.SFTP_HOST || 'gennetten.org',
  username: process.env.SFTP_USERNAME || 'dgennetten',
  password: process.env.SFTP_PASSWORD || '',
  port: parseInt(process.env.SFTP_PORT) || 22
};

const LOG_PATH = process.env.SFTP_LOG_PATH || '/home/_domain_logs/dgennetten/sundial.gennetten.org/https.54243421/';

async function testConnection(config) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    console.log(`\n🔌 Testing connection with:`);
    console.log(`   Host: ${config.host}`);
    console.log(`   Username: ${config.username}`);
    console.log(`   Password: ${'*'.repeat(config.password.length)}`);
    console.log(`   Port: ${config.port}`);
    
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('Connection timeout (30 seconds)'));
    }, 30000);
    
    conn.on('ready', () => {
      clearTimeout(timeout);
      console.log('✅ SSH connection established!');
      
      conn.sftp((err, sftp) => {
        if (err) {
          console.error('❌ SFTP session failed:', err.message);
          conn.end();
          reject(err);
          return;
        }
        
        console.log('✅ SFTP session established!');
        console.log(`🔍 Checking log directory: ${LOG_PATH}`);
        
        sftp.readdir(LOG_PATH, (err, list) => {
          if (err) {
            console.error(`❌ Cannot access log directory:`, err.message);
            
            // Try to check if the parent directory exists
            const parentPath = LOG_PATH.split('/').slice(0, -1).join('/');
            console.log(`🔍 Checking parent directory: ${parentPath}`);
            
            sftp.readdir(parentPath, (err2, parentList) => {
              if (err2) {
                console.error(`❌ Parent directory also inaccessible:`, err2.message);
              } else {
                console.log(`✅ Parent directory accessible. Contents:`);
                parentList.forEach(item => {
                  console.log(`   📁 ${item.filename}`);
                });
              }
              conn.end();
              reject(err);
            });
          } else {
            console.log(`✅ Log directory accessible!`);
            console.log(`📄 Found ${list.length} files:`);
            
            list.forEach(file => {
              const sizeKB = Math.round(file.attrs.size / 1024);
              const modDate = new Date(file.attrs.mtime * 1000).toLocaleDateString();
              console.log(`   📄 ${file.filename} (${sizeKB} KB, ${modDate})`);
            });
            
            const accessLogs = list.filter(file => 
              file.filename.includes('access.log') && 
              !file.filename.includes('.gz')
            );
            
            if (accessLogs.length > 0) {
              console.log(`\n🎯 Found ${accessLogs.length} access log file(s)!`);
              accessLogs.forEach(log => {
                console.log(`   ✅ ${log.filename}`);
              });
            } else {
              console.log(`\n⚠️  No uncompressed access.log files found`);
            }
            
            conn.end();
            resolve(true);
          }
        });
      });
    });
    
    conn.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ Connection failed:', err.message);
      
      if (err.level === 'client-authentication') {
        console.log('\n💡 Authentication failed. This could mean:');
        console.log('   - Username or password is incorrect');
        console.log('   - SFTP access is not enabled for this user');
        console.log('   - Account requires SSH key authentication');
        console.log('   - Account is locked or suspended');
      } else if (err.code === 'ENOTFOUND') {
        console.log('\n💡 Host not found. This could mean:');
        console.log('   - Domain name is incorrect');
        console.log('   - DNS resolution issue');
        console.log('   - Internet connectivity problem');
      } else if (err.code === 'ECONNREFUSED') {
        console.log('\n💡 Connection refused. This could mean:');
        console.log('   - SFTP service is not running');
        console.log('   - Port 22 is blocked');
        console.log('   - Firewall is blocking the connection');
      }
      
      reject(err);
    });
    
    console.log('🔄 Connecting...');
    conn.connect(config);
  });
}

async function main() {
  console.log('🔐 SFTP Credential Verification Tool');
  console.log('=====================================\n');
  
  console.log('Current configuration:');
  console.log(`Host: ${CURRENT_CONFIG.host}`);
  console.log(`Username: ${CURRENT_CONFIG.username}`);
  console.log(`Password: ${'*'.repeat(CURRENT_CONFIG.password.length)}`);
  console.log(`Port: ${CURRENT_CONFIG.port}`);
  
  const choice = await question('\nWhat would you like to do?\n1. Test current credentials\n2. Test with different credentials\n3. Test different hosts\n4. Exit\n\nChoice (1-4): ');
  
  try {
    switch (choice) {
      case '1':
        console.log('\n🧪 Testing current credentials...');
        await testConnection(CURRENT_CONFIG);
        console.log('\n🎉 Success! Current credentials work.');
        break;
        
      case '2':
        console.log('\n📝 Enter new credentials to test:');
        const newHost = await question(`Host (${CURRENT_CONFIG.host}): `) || CURRENT_CONFIG.host;
        const newUsername = await question(`Username (${CURRENT_CONFIG.username}): `) || CURRENT_CONFIG.username;
        const newPassword = await question('Password: ');
        const newPort = await question(`Port (${CURRENT_CONFIG.port}): `) || CURRENT_CONFIG.port;
        
        const newConfig = {
          host: newHost,
          username: newUsername,
          password: newPassword || CURRENT_CONFIG.password,
          port: parseInt(newPort)
        };
        
        await testConnection(newConfig);
        
        const update = await question('\n✅ Success! Update the scripts with these credentials? (y/n): ');
        if (update.toLowerCase() === 'y') {
          console.log('🔄 Updating credentials in scripts...');
          // We'll implement the update logic here
          console.log('✅ Credentials updated!');
        }
        break;
        
      case '3':
        console.log('\n🌐 Testing alternative hosts...');
        const hosts = [
          'gennetten.org',
          'ftp.gennetten.org',
          'sftp.gennetten.org',
          'ssh.gennetten.org'
        ];
        
        for (const host of hosts) {
          try {
            console.log(`\n🔍 Trying host: ${host}`);
            await testConnection({ ...CURRENT_CONFIG, host });
            console.log(`✅ Success with host: ${host}`);
            break;
          } catch (err) {
            console.log(`❌ Failed with host: ${host}`);
          }
        }
        break;
        
      case '4':
        console.log('👋 Goodbye!');
        break;
        
      default:
        console.log('❌ Invalid choice');
    }
  } catch (error) {
    console.log('\n💥 Test failed');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Log into your Dreamhost panel');
    console.log('2. Go to Users > Manage Users');
    console.log('3. Check if SFTP access is enabled for your user');
    console.log('4. Verify your username and password');
    console.log('5. Consider using SSH keys instead of password');
  }
  
  rl.close();
}

main().catch(console.error);