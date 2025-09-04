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
  remotePath: process.env.FTP_REMOTE_PATH || 'your-domain.com' // Your remote directory
};

// Validate that all required environment variables are present
if (!config.host || !config.user || !config.password) {
  console.error('❌ Missing required FTP credentials:');
  console.error(`   FTP_HOST: ${config.host ? '✅ Set' : '❌ Missing'}`);
  console.error(`   FTP_USER: ${config.user ? '✅ Set' : '❌ Missing'}`);
  console.error(`   FTP_PASSWORD: ${config.password ? '✅ Set' : '❌ Missing'}`);
  console.error('Please ensure all FTP environment variables are properly configured.');
  process.exit(1);
}

const localPath = path.join(__dirname, 'dist');
const phpFiles = ['export-logger.php']; // PHP files to deploy alongside the app

console.log('🚀 Starting deployment...');
console.log(`📡 Connecting to FTP server: ${config.host}`);
console.log(`👤 Using username: ${config.user}`);
console.log(`📁 Target directory: ${config.remotePath}`);

const c = new ftp();

c.on('ready', () => {
  console.log('✅ Connected to FTP server successfully!');
  c.list(config.remotePath, (err, list) => {
    if (err) {
      console.error('❌ Failed to list remote directory:', err.message);
      throw err;
    }
    const deletePromises = list.map(item => {
      return new Promise((resolve, reject) => {
        const remoteFile = `${config.remotePath}/${item.name}`;
        
        if (item.type === 'd') {
          c.rmdir(remoteFile, true, err => {
            if (err) return reject(err);
            console.log(`Deleted directory: ${remoteFile}`);
            resolve();
          });
        } else {
          c.delete(remoteFile, err => {
            if (err) return reject(err);
            console.log(`Deleted file: ${remoteFile}`);
            resolve();
          });
        }
      });
    });

    Promise.all(deletePromises)
      .then(() => {
        console.log('Cleared remote directory.');
        return uploadDir(localPath, config.remotePath);
      })
      .then(() => {
        console.log('Dist files uploaded. Now uploading PHP files...');
        return uploadPHPFiles();
      })
      .then(() => {
        console.log('✅ All files uploaded successfully.');
        c.end();
      })
      .catch(err => {
        console.error('Error during deployment:', err);
        c.end();
      });
  });
});

function uploadDir(localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    fs.readdir(localDir, { withFileTypes: true }, (err, files) => {
      if (err) return reject(err);

      const uploadPromises = files.map(file => {
        return new Promise((fileResolve, fileReject) => {
          const localFilePath = path.join(localDir, file.name);
          const remoteFilePath = `${remoteDir}/${file.name}`;

          if (file.isDirectory()) {
            c.mkdir(remoteFilePath, true, err => {
              if (err) return fileReject(err);
              console.log(`Created directory: ${remoteFilePath}`);
              uploadDir(localFilePath, remoteFilePath)
                .then(fileResolve)
                .catch(fileReject);
            });
          } else {
            c.put(localFilePath, remoteFilePath, err => {
              if (err) return fileReject(err);
              console.log(`Uploaded file: ${localFilePath} to ${remoteFilePath}`);
              fileResolve();
            });
          }
        });
      });

      Promise.all(uploadPromises)
        .then(resolve)
        .catch(reject);
    });
  });
}

function uploadPHPFiles() {
  return new Promise((resolve, reject) => {
    const uploadPromises = phpFiles.map(filename => {
      return new Promise((fileResolve, fileReject) => {
        const localFilePath = path.join(__dirname, filename);
        const remoteFilePath = `${config.remotePath}/${filename}`;

        // Check if local file exists
        if (!fs.existsSync(localFilePath)) {
          console.warn(`⚠️  PHP file not found: ${localFilePath}`);
          return fileResolve(); // Continue with other files
        }

        c.put(localFilePath, remoteFilePath, err => {
          if (err) return fileReject(err);
          console.log(`✅ Uploaded PHP file: ${filename}`);
          fileResolve();
        });
      });
    });

    Promise.all(uploadPromises)
      .then(() => {
        console.log('📄 All PHP files uploaded successfully.');
        resolve();
      })
      .catch(reject);
  });
}

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