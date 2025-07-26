import ftp from 'ftp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deployToDreamHost() {
  const ftpConfig = {
    host: process.env.FTP_HOST || 'gennetten.org',
    user: process.env.FTP_USERNAME || 'dgennetten',
    password: process.env.FTP_PASSWORD,
    secure: false, // Set to true if FTPS is required
  };

  // Validate required environment variables
  if (!ftpConfig.password) {
    console.error('❌ Error: FTP_PASSWORD environment variable is required');
    console.log('💡 Please check your .env file and ensure FTP_PASSWORD is set');
    return;
  }

  const localDistPath = path.join(__dirname, 'dist');
  const remoteBasePath = '/sundial.gennetten.org';
  const remoteAssetsPath = `${remoteBasePath}/assets`;

  // Verify local dist folder exists
  try {
    await fs.access(localDistPath);
    console.log(`Local dist folder found: ${localDistPath}`);
  } catch (err) {
    console.error(`Error: Local dist folder not found at ${localDistPath}`);
    return;
  }

  const client = new ftp();

  try {
    console.log('Connecting to FTP server...');
    await new Promise((resolve, reject) => {
      client.on('ready', resolve);
      client.on('error', reject);
      client.connect(ftpConfig);
    });
    console.log('Connected to FTP.');

    console.log(`Deleting remote folder: ${remoteAssetsPath}`);
    try {
      await deleteRemoteDirectory(client, remoteAssetsPath);
      console.log('Assets folder deleted successfully.');
    } catch (err) {
      console.error('Error deleting assets folder:', err.message);
    }

    console.log('Uploading dist folder contents...');
    await uploadDirectory(client, localDistPath, remoteBasePath);
    console.log('Upload completed successfully.');

  } catch (err) {
    console.error('Error during deployment:', err.message, err.stack);
  } finally {
    client.end();
    console.log('FTP connection closed.');
  }
}

async function deleteRemoteDirectory(client, remotePath) {
  try {
    const list = await new Promise((resolve, reject) => {
      client.list(remotePath, (err, list) => {
        if (err) reject(err);
        else resolve(list);
      });
    });

    for (const item of list) {
      const itemPath = `${remotePath}/${item.name}`;
      if (item.type === 'd') {
        await deleteRemoteDirectory(client, itemPath);
      } else {
        await new Promise((resolve, reject) => {
          client.delete(itemPath, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }

    await new Promise((resolve, reject) => {
      client.rmdir(remotePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    if (err.code === 550) {
      console.log(`Directory ${remotePath} does not exist, skipping deletion.`);
    } else {
      throw err;
    }
  }
}

async function uploadDirectory(client, localPath, remotePath) {
  const items = await fs.readdir(localPath, { withFileTypes: true });

  await new Promise((resolve, reject) => {
    client.mkdir(remotePath, true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  for (const item of items) {
    const localItemPath = path.join(localPath, item.name);
    const remoteItemPath = `${remotePath}/${item.name}`;

    if (item.isDirectory()) {
      await uploadDirectory(client, localItemPath, remoteItemPath);
    } else {
      await new Promise((resolve, reject) => {
        client.put(localItemPath, remoteItemPath, (err) => {
          if (err) reject(err);
          else {
            console.log(`Uploaded: ${remoteItemPath}`);
            resolve();
          }
        });
      });
    }
  }
}

deployToDreamHost();