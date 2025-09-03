import ftp from 'ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file (if it exists)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remotePath: 'sundial.gennetten.org'
};

console.log('🧪 Testing visitor-data.json upload specifically...');

// Validate that all required environment variables are present
if (!config.host || !config.user || !config.password) {
  console.error('❌ Missing required FTP credentials');
  process.exit(1);
}

const localFile = path.join(__dirname, 'dist', 'visitor-data.json');
const remoteFile = `${config.remotePath}/visitor-data.json`;

// Check if local file exists
if (!fs.existsSync(localFile)) {
  console.error(`❌ Local file not found: ${localFile}`);
  process.exit(1);
}

const stats = fs.statSync(localFile);
console.log(`📄 Local file: ${localFile}`);
console.log(`📊 Size: ${stats.size} bytes`);
console.log(`🕒 Modified: ${stats.mtime}`);

const c = new ftp();

c.on('ready', () => {
  console.log('✅ Connected to FTP server');
  
  console.log(`🚀 Uploading to: ${remoteFile}`);
  c.put(localFile, remoteFile, (err) => {
    if (err) {
      console.error('❌ Upload failed:', err.message);
      c.end();
      process.exit(1);
    }
    
    console.log('✅ Upload completed!');
    
    // Verify the upload
    c.list(config.remotePath, (listErr, list) => {
      if (listErr) {
        console.error('⚠️  Could not verify upload:', listErr.message);
        c.end();
        return;
      }
      
      const uploadedFile = list.find(item => item.name === 'visitor-data.json');
      if (uploadedFile) {
        console.log('🔍 Verification successful:');
        console.log(`   Remote size: ${uploadedFile.size} bytes`);
        console.log(`   Remote date: ${uploadedFile.date}`);
        console.log(`   Size match: ${uploadedFile.size === stats.size ? '✅' : '❌'}`);
      } else {
        console.error('❌ File not found on server after upload!');
      }
      
      c.end();
    });
  });
});

c.on('error', (err) => {
  console.error('❌ FTP connection error:', err.message);
  process.exit(1);
});

c.connect(config);