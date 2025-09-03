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
  remotePath: 'sundial.gennetten.org' // Your remote directory on DreamHost
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
        
        // Delete visitor-data.json normally - we'll upload it last
        if (item.name === 'visitor-data.json') {
          console.log(`🗑️  Deleting visitor-data.json (will upload fresh copy last)`);
        }
        
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
        console.log('📄 All PHP files uploaded successfully. Now uploading visitor-data.json as final step...');
        return uploadVisitorDataFinal();
      })
      .then(() => {
        console.log('✅ All files uploaded successfully (including visitor-data.json).');
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

          // Skip visitor-data.json in main upload - we'll upload it last
          if (file.name === 'visitor-data.json') {
            console.log(`⏭️  Skipping visitor-data.json in main upload (will upload last)`);
            fileResolve();
            return;
          }

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
              
              const stats = fs.statSync(localFilePath);
              console.log(`   File size: ${stats.size} bytes`);
              console.log(`   File modified: ${stats.mtime}`);
              
              // Read and show first few lines of the file
              const content = fs.readFileSync(localFilePath, 'utf8');
              const firstLines = content.split('\n').slice(0, 10).join('\n');
              console.log(`   File content preview:`);
              console.log(`   ${firstLines}...`);
            }
            
            c.put(localFilePath, remoteFilePath, err => {
              if (err) return fileReject(err);
              console.log(`Uploaded file: ${localFilePath} to ${remoteFilePath}`);
              
              // Extra confirmation for visitor-data.json
              if (file.name === 'visitor-data.json') {
                console.log(`✅ visitor-data.json upload completed successfully!`);
                
                // Verify the file was uploaded by listing the directory again
                c.list(config.remotePath, (listErr, newList) => {
                  if (listErr) {
                    console.error(`⚠️  Could not verify visitor-data.json upload: ${listErr.message}`);
                  } else {
                    const uploadedFile = newList.find(item => item.name === 'visitor-data.json');
                    if (uploadedFile) {
                      console.log(`🔍 Verification: visitor-data.json found on server:`);
                      console.log(`   Size: ${uploadedFile.size} bytes`);
                      console.log(`   Modified: ${uploadedFile.date}`);
                    } else {
                      console.error(`❌ Verification failed: visitor-data.json NOT found on server!`);
                    }
                  }
                });
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

function uploadVisitorDataFinal() {
  return new Promise((resolve, reject) => {
    const localFilePath = path.join(__dirname, 'dist', 'visitor-data.json');
    const remoteFilePath = `${config.remotePath}/visitor-data.json`;
    
    console.log(`🎯 Final upload of visitor-data.json:`);
    console.log(`   Local: ${localFilePath}`);
    console.log(`   Remote: ${remoteFilePath}`);
    
    // Check if local file exists
    if (!fs.existsSync(localFilePath)) {
      return reject(new Error(`Local visitor-data.json not found: ${localFilePath}`));
    }
    
    const stats = fs.statSync(localFilePath);
    console.log(`   Size: ${stats.size} bytes`);
    console.log(`   Modified: ${stats.mtime}`);
    
    c.put(localFilePath, remoteFilePath, (err) => {
      if (err) {
        console.error(`❌ Failed to upload visitor-data.json: ${err.message}`);
        return reject(err);
      }
      
      console.log(`✅ visitor-data.json uploaded successfully!`);
      
      // Verify the upload
      c.list(config.remotePath, (listErr, list) => {
        if (listErr) {
          console.error(`⚠️  Could not verify visitor-data.json upload: ${listErr.message}`);
          resolve(); // Don't fail the whole deployment for verification issues
          return;
        }
        
        const uploadedFile = list.find(item => item.name === 'visitor-data.json');
        if (uploadedFile) {
          console.log(`🔍 Final verification: visitor-data.json confirmed on server:`);
          console.log(`   Remote size: ${uploadedFile.size} bytes`);
          console.log(`   Remote date: ${uploadedFile.date}`);
          console.log(`   Size match: ${uploadedFile.size === stats.size ? '✅' : '❌'}`);
        } else {
          console.error(`❌ Final verification failed: visitor-data.json NOT found on server!`);
        }
        
        resolve();
      });
    });
  });
}

c.connect(config);