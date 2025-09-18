#!/usr/bin/env node

// SFTP Diagnostic Script
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SFTP_CONFIG = {
  host: process.env.SFTP_HOST,
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD,
  port: parseInt(process.env.SFTP_PORT) || 22
};

console.log('🔧 SFTP Configuration:');
console.log(`  Host: ${SFTP_CONFIG.host}`);
console.log(`  Username: ${SFTP_CONFIG.username}`);
console.log(`  Password: ${process.env.SFTP_PASSWORD ? '***' + process.env.SFTP_PASSWORD.slice(-4) : 'Not set'}`);
console.log(`  Port: ${SFTP_CONFIG.port}`);
console.log('');

function exploreDirectory(sftp, dirPath, maxDepth = 3, currentDepth = 0) {
  return new Promise((resolve) => {
    if (currentDepth > maxDepth) {
      resolve();
      return;
    }

    sftp.readdir(dirPath, (err, list) => {
      if (err) {
        console.log(`❌ Cannot read: ${dirPath} (${err.message})`);
        resolve();
        return;
      }

      console.log(`📁 ${dirPath}:`);
      const subdirs = [];

      list.forEach(item => {
        const fullPath = path.posix.join(dirPath, item.filename);
        const isDir = item.attrs.isDirectory();

        if (isDir) {
          console.log(`  📂 ${item.filename}/`);
          if (item.filename.includes('log') || item.filename.includes('access') || currentDepth < 2) {
            subdirs.push(fullPath);
          }
        } else {
          console.log(`  📄 ${item.filename}`);
        }
      });

      // Explore subdirectories
      const explorePromises = subdirs.map(subdir =>
        exploreDirectory(sftp, subdir, maxDepth, currentDepth + 1)
      );

      Promise.all(explorePromises).then(() => resolve());
    });
  });
}

async function testSFTP() {
  console.log('🔌 Testing SFTP connection...\n');

  const conn = new Client();

  return new Promise((resolve) => {
    conn.on('ready', () => {
      console.log('✅ SFTP Connected successfully!\n');

      conn.sftp(async (err, sftp) => {
        if (err) {
          console.error('❌ SFTP error:', err.message);
          conn.end();
          resolve();
          return;
        }

        console.log('🔍 Exploring directory structure...\n');

        // Try common log locations
        const commonPaths = [
          '/',
          '/home',
          `/home/${process.env.SFTP_USERNAME}`,
          `/home/${process.env.SFTP_USERNAME}/logs`,
          process.env.SFTP_LOG_PATH || '/home/logs'
        ];

        for (const testPath of commonPaths) {
          try {
            await exploreDirectory(sftp, testPath, 2);
            console.log('');
          } catch (e) {
            // Ignore errors for exploration
          }
        }

        // Look for access logs specifically
        console.log('🔎 Looking for access log files...\n');

        const searchPaths = [
          process.env.SFTP_LOG_PATH || '/home/logs',
          '/var/log',
          '/var/log/apache2',
          '/var/log/httpd',
          '/var/log/nginx'
        ];

        for (const searchPath of searchPaths) {
          try {
            const list = await new Promise((resolve, reject) => {
              sftp.readdir(searchPath, (err, list) => {
                if (err) reject(err);
                else resolve(list);
              });
            });

            const logFiles = list.filter(item =>
              !item.attrs.isDirectory() &&
              (item.filename.includes('access') || item.filename.includes('log'))
            );

            if (logFiles.length > 0) {
              console.log(`📊 Found log files in ${searchPath}:`);
              logFiles.forEach(file => {
                console.log(`  📄 ${file.filename} (${file.attrs.size} bytes)`);
              });
              console.log('');
            }
          } catch (e) {
            // Path doesn't exist, continue
          }
        }

        conn.end();
        console.log('🔚 SFTP connection closed.');
        resolve();
      });
    });

    conn.on('error', (err) => {
      console.error('❌ SFTP Connection failed:', err.message);
      console.error('💡 Possible issues:');
      console.error('   - Wrong hostname, username, or password');
      console.error('   - SSH access not enabled for this user');
      console.error('   - Firewall blocking connection');
      resolve();
    });

    conn.on('timeout', () => {
      console.error('⏰ Connection timeout');
      resolve();
    });

    console.log('⏳ Connecting...');
    conn.connect(SFTP_CONFIG);
  });
}

// Run the test
testSFTP().then(() => {
  console.log('\n🎯 Next steps:');
  console.log('1. Update SFTP_LOG_PATH in .env.local with the correct path');
  console.log('2. Run: npm run update-visitors-7d');
}).catch(console.error);
