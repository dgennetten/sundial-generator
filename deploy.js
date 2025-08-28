import ftp from 'ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remotePath: '/home/dgennetten/sundial.gennetten.org/' // Your remote directory on DreamHost
};

const localPath = path.join(__dirname, 'dist');

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
        uploadDir(localPath, config.remotePath);
      })
      .catch(err => {
        console.error('Error clearing remote directory:', err);
        c.end();
      });
  });
});

function uploadDir(localDir, remoteDir) {
  fs.readdir(localDir, { withFileTypes: true }, (err, files) => {
    if (err) throw err;

    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const localFilePath = path.join(localDir, file.name);
        const remoteFilePath = `${remoteDir}/${file.name}`;

        if (file.isDirectory()) {
          c.mkdir(remoteFilePath, true, err => {
            if (err) return reject(err);
            console.log(`Created directory: ${remoteFilePath}`);
            uploadDir(localFilePath, remoteFilePath);
            resolve();
          });
        } else {
          c.put(localFilePath, remoteFilePath, err => {
            if (err) return reject(err);
            console.log(`Uploaded file: ${localFilePath} to ${remoteFilePath}`);
            resolve();
          });
        }
      });
    });

    Promise.all(uploadPromises)
      .then(() => {
        if (localDir === localPath) {
          console.log('All files uploaded successfully.');
          c.end();
        }
      })
      .catch(err => {
        console.error('Error uploading files:', err);
        c.end();
      });
  });
}

c.connect(config);