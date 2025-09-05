import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
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

const localPath = path.join(__dirname, 'dist');
const phpFiles = ['export-logger.php']; // PHP files to deploy alongside the app
const docsPath = path.join(__dirname, 'public', 'docs'); // Documents directory

console.log('🚀 Starting SFTP deployment...');
console.log(`📡 Connecting to SFTP server: ${config.host}`);
console.log(`👤 Using username: ${config.username}`);
console.log(`📁 Target directory: ${config.remotePath}`);

const sftp = new Client();

// Helper function to calculate file hash
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Helper function to check if file needs uploading
async function shouldUploadFile(sftp, localFilePath, remoteFilePath) {
  try {
    // Check if remote file exists
    const remoteExists = await sftp.exists(remoteFilePath);
    if (!remoteExists) {
      return { shouldUpload: true, reason: 'File does not exist on server' };
    }

    // Get remote file stats
    const remoteStats = await sftp.stat(remoteFilePath);
    const localStats = fs.statSync(localFilePath);

    // Compare file sizes first (quick check)
    if (remoteStats.size !== localStats.size) {
      return { shouldUpload: true, reason: 'File size differs' };
    }

    // Compare modification times
    const remoteModTime = new Date(remoteStats.mtime);
    const localModTime = new Date(localStats.mtime);
    
    if (localModTime > remoteModTime) {
      return { shouldUpload: true, reason: 'Local file is newer' };
    }

    return { shouldUpload: false, reason: 'File is up to date' };
  } catch (error) {
    // If we can't check, assume we should upload
    return { shouldUpload: true, reason: `Error checking file: ${error.message}` };
  }
}

// Smart docs upload function
async function uploadDocsIfNeeded(sftp, docsPath, remoteDocsPath) {
  if (!fs.existsSync(docsPath)) {
    console.log('📄 No docs directory found, skipping...');
    return;
  }

  console.log('📤 Checking docs directory for changes...');
  
  // Ensure remote docs directory exists
  try {
    await sftp.mkdir(remoteDocsPath, true);
    console.log(`📁 Ensured docs directory exists: ${remoteDocsPath}`);
  } catch (err) {
    // Directory might already exist, continue
  }

  const files = fs.readdirSync(docsPath, { withFileTypes: true });
  let uploadedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (file.isFile()) {
      const localFilePath = path.join(docsPath, file.name);
      const remoteFilePath = `${remoteDocsPath}/${file.name}`;
      
      const { shouldUpload, reason } = await shouldUploadFile(sftp, localFilePath, remoteFilePath);
      
      if (shouldUpload) {
        await sftp.put(localFilePath, remoteFilePath);
        console.log(`✅ Uploaded doc: ${file.name} (${reason})`);
        uploadedCount++;
      } else {
        console.log(`⏭️  Skipped doc: ${file.name} (${reason})`);
        skippedCount++;
      }
    }
  }

  console.log(`📄 Docs upload complete: ${uploadedCount} uploaded, ${skippedCount} skipped`);
}

async function deployWithSFTP() {
  try {
    // Connect to SFTP server
    await sftp.connect(config);
    console.log('✅ Connected to SFTP server successfully!');

    // Check if remote directory exists, create if it doesn't
    try {
      const dirExists = await sftp.exists(config.remotePath);
      if (!dirExists) {
        console.log('📁 Remote directory does not exist, creating it...');
        await sftp.mkdir(config.remotePath, true);
        console.log('✅ Remote directory created successfully!');
      }
    } catch (err) {
      console.log('📁 Creating remote directory...');
      await sftp.mkdir(config.remotePath, true);
      console.log('✅ Remote directory created successfully!');
    }

    // List existing files in remote directory
    console.log('🔍 Checking existing files in remote directory...');
    let existingFiles = [];
    try {
      existingFiles = await sftp.list(config.remotePath);
      console.log(`Found ${existingFiles.length} existing files/directories`);
    } catch (err) {
      console.log('📁 Directory is empty or newly created');
    }

    // Delete existing files (except . and .. and docs directory)
    for (const file of existingFiles) {
      if (file.name !== '.' && file.name !== '..' && file.name !== 'docs') {
        const remoteFilePath = `${config.remotePath}/${file.name}`;
        try {
          if (file.type === 'd') {
            await sftp.rmdir(remoteFilePath, true);
            console.log(`🗑️  Deleted directory: ${file.name}`);
          } else {
            await sftp.delete(remoteFilePath);
            console.log(`🗑️  Deleted file: ${file.name}`);
          }
        } catch (err) {
          console.warn(`⚠️  Could not delete ${file.name}: ${err.message}`);
        }
      }
    }

    console.log('🧹 Cleared remote directory (preserved docs)');

    // Upload dist directory
    console.log('📤 Uploading dist files...');
    await uploadDirectory(sftp, localPath, config.remotePath);

    // Upload PHP files
    console.log('📤 Uploading PHP files...');
    for (const filename of phpFiles) {
      const localFilePath = path.join(__dirname, filename);
      const remoteFilePath = `${config.remotePath}/${filename}`;

      if (fs.existsSync(localFilePath)) {
        await sftp.put(localFilePath, remoteFilePath);
        console.log(`✅ Uploaded PHP file: ${filename}`);
      } else {
        console.warn(`⚠️  PHP file not found: ${localFilePath}`);
      }
    }

    // Smart upload docs directory (only if files changed or don't exist)
    const remoteDocsPath = `${config.remotePath}/docs`;
    await uploadDocsIfNeeded(sftp, docsPath, remoteDocsPath);

    console.log('✅ All files uploaded successfully!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  } finally {
    await sftp.end();
    console.log('📡 SFTP connection closed');
  }
}

async function uploadDirectory(sftp, localDir, remoteDir) {
  const files = fs.readdirSync(localDir, { withFileTypes: true });
  
  for (const file of files) {
    const localFilePath = path.join(localDir, file.name);
    const remoteFilePath = `${remoteDir}/${file.name}`;
    
    if (file.isDirectory()) {
      // Create remote directory
      try {
        await sftp.mkdir(remoteFilePath, true);
        console.log(`📁 Created directory: ${file.name}`);
      } catch (err) {
        // Directory might already exist, continue
      }
      
      // Recursively upload directory contents
      await uploadDirectory(sftp, localFilePath, remoteFilePath);
    } else {
      // Upload file
      await sftp.put(localFilePath, remoteFilePath);
      console.log(`✅ Uploaded: ${file.name}`);
    }
  }
}

// Run deployment
deployWithSFTP()
  .then(() => {
    console.log('🎉 Deployment completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  });