import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env and .env.local files
dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: process.env.SFTP_HOST || process.env.FTP_HOST,
  username: process.env.SFTP_USERNAME || process.env.FTP_USER,
  password: process.env.SFTP_PASSWORD || process.env.FTP_PASSWORD,
  remotePath: process.env.FTP_REMOTE_PATH || '/home/dgennetten/sundial.gennetten.org/',
  port: 22
};

// Validate that all required environment variables are present
if (!config.host || !config.username || !config.password) {
  console.error('❌ Missing required SFTP credentials:');
  console.error(`   SFTP_HOST: ${config.host ? '✅ Set' : '❌ Missing'}`);
  console.error(`   SFTP_USERNAME: ${config.username ? '✅ Set' : '❌ Missing'}`);
  console.error(`   SFTP_PASSWORD: ${config.password ? '✅ Set' : '❌ Missing'}`);
  console.error('Please ensure all SFTP environment variables are properly configured.');
  process.exit(1);
}

const docsPath = path.join(__dirname, 'public', 'docs');
const sftp = new Client();

async function forceUploadDocs() {
  try {
    if (!fs.existsSync(docsPath)) {
      console.log('❌ No docs directory found at:', docsPath);
      process.exit(1);
    }

    // Connect to SFTP server
    await sftp.connect(config);
    console.log('✅ Connected to SFTP server successfully!');

    const remoteDocsPath = `${config.remotePath}/docs`;
    
    // Ensure remote docs directory exists
    try {
      await sftp.mkdir(remoteDocsPath, true);
      console.log(`📁 Ensured docs directory exists: ${remoteDocsPath}`);
    } catch (err) {
      // Directory might already exist, continue
    }

    console.log('📤 Force uploading all docs...');
    
    const files = fs.readdirSync(docsPath, { withFileTypes: true });
    let uploadedCount = 0;

    for (const file of files) {
      if (file.isFile()) {
        const localFilePath = path.join(docsPath, file.name);
        const remoteFilePath = `${remoteDocsPath}/${file.name}`;
        
        const stats = fs.statSync(localFilePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`📤 Uploading: ${file.name} (${fileSizeMB} MB)...`);
        await sftp.put(localFilePath, remoteFilePath);
        console.log(`✅ Uploaded: ${file.name}`);
        uploadedCount++;
      }
    }

    console.log(`🎉 Force upload complete: ${uploadedCount} files uploaded`);
    
  } catch (error) {
    console.error('❌ Force upload failed:', error.message);
    throw error;
  } finally {
    await sftp.end();
    console.log('📡 SFTP connection closed');
  }
}

console.log('🚀 Starting force docs upload...');
console.log(`📡 Connecting to SFTP server: ${config.host}`);
console.log(`👤 Using username: ${config.username}`);
console.log(`📁 Target directory: ${config.remotePath}/docs`);

// Run force upload
forceUploadDocs()
  .then(() => {
    console.log('🎉 Force docs upload completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Force docs upload failed:', error.message);
    process.exit(1);
  });