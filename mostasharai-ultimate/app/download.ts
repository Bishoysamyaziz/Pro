import https from 'https';
import fs from 'fs';
import path from 'path';

const fileId = '1N0-5Guzs4HW9d5iR9hyMqDs7pWQGBkT7';
const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

const download = (url: string, dest: string) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 303) {
        download(res.headers.location as string, dest).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        reject(new Error(`Failed to download, status code: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
};

download(url, 'design.zip')
  .then(() => console.log('Download complete'))
  .catch(err => console.error('Download failed:', err));
