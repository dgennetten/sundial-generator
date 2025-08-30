import ftp from 'ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remotePath: 'sundial.gennetten.org'
};

const phpFiles = [
  'export-logger.php'
];

const c = new ftp();

c.on('ready', () => {
  console.log('✅ Connected to FTP server.');
  
  const uploadPromises = phpFiles.map(filename => {
    return new Promise((resolve, reject) => {
      const localFilePath = path.join(__dirname, filename);
      const remoteFilePath = `${config.remotePath}/${filename}`;

      // Check if local file exists
      if (!fs.existsSync(localFilePath)) {
        console.error(`❌ PHP file not found: ${localFilePath}`);
        return reject(new Error(`File not found: ${filename}`));
      }

      console.log(`📤 Uploading ${filename}...`);
      c.put(localFilePath, remoteFilePath, err => {
        if (err) {
          console.error(`❌ Failed to upload ${filename}:`, err);
          return reject(err);
        }
        console.log(`✅ Successfully uploaded: ${filename}`);
        resolve();
      });
    });
  });

  Promise.all(uploadPromises)
    .then(() => {
      console.log('🎉 All PHP files uploaded successfully!');
      c.end();
    })
    .catch(err => {
      console.error('❌ Error uploading PHP files:', err);
      c.end();
    });
});

c.on('error', (err) => {
  console.error('❌ FTP connection error:', err);
});

console.log('🚀 Starting PHP file upload...');
console.log(`🌐 Remote path: ${config.remotePath}`);
console.log(`📄 Files to upload: ${phpFiles.join(', ')}`);

c.connect(config);