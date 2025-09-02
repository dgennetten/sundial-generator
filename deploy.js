import ftp from 'ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remotePath: 'sundial.gennetten.org' // Your remote directory on DreamHost
};

const localPath = path.join(__dirname, 'dist');
const phpFiles = ['export-logger.php']; // PHP files to deploy alongside the app

const c = new ftp();

c.on('ready', () => {
  console.log('Connected to FTP server.');
  c.list(config.remotePath, (err, list) => {
    if (err) throw err;
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
        console.log('✅ All files uploaded successfully (including PHP files).');
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
            // Special logging for visitor-data.json
            if (file.name === 'visitor-data.json') {
              console.log(`🔍 About to upload visitor-data.json:`);
              console.log(`   Local path: ${localFilePath}`);
              console.log(`   Remote path: ${remoteFilePath}`);
              console.log(`   File size: ${fs.statSync(localFilePath).size} bytes`);
            }
            
            c.put(localFilePath, remoteFilePath, err => {
              if (err) return fileReject(err);
              console.log(`Uploaded file: ${localFilePath} to ${remoteFilePath}`);
              
              // Extra confirmation for visitor-data.json
              if (file.name === 'visitor-data.json') {
                console.log(`✅ visitor-data.json upload completed successfully!`);
              }
              
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

c.connect(config);