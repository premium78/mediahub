const { execFile } = require('child_process');
const fs = require('fs');

const path = require('path');
const os = require('os');

const DOWNLOAD_DIR = path.join(os.tmpdir(), 'mediahub');
const OUTPUT_PATH = path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s');
const THUMB_PATH = path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s');

// Folder তৈরি করো যদি না থাকে
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) return reject(new Error('TIMEOUT'));
        return reject(new Error(stderr || error.message));
      }
      resolve(stdout.trim());
    });
  });
}

async function getVideoInfoAndFormats(url) {
  const stdout = await runYtDlp(['--dump-json', '--no-playlist', url]);
  const data = JSON.parse(stdout);

  const qualityMap = {};
  (data.formats || []).forEach(f => {
    if (f.vcodec !== 'none' && f.height) {
      const h = f.height;
      if (!qualityMap[h]) {
        let label = '';
        if (h >= 1080) label = '🔵 1080p';
        else if (h >= 720) label = '🟢 720p';
        else if (h >= 480) label = '🟡 480p';
        else if (h >= 360) label = '🟠 360p';
        else label = `🔴 ${h}p`;
        qualityMap[h] = { label, value: String(h) };
      }
    }
  });

  const formats = Object.values(qualityMap)
    .sort((a, b) => Number(b.value) - Number(a.value));

  if (formats.length === 0) {
    formats.push({ label: '🏆 Best Quality', value: 'best' });
  }

  return {
  title: data.title,
  thumbnail: data.thumbnail,
  duration: data.duration || 0,
  view_count: data.view_count || 0,
  uploader: data.uploader || data.channel || '',
  formats
};
}

function downloadVideoWithProgress(url, quality, onProgress, onCancel) {
  return new Promise((resolve, reject) => {
    const format = quality && quality !== 'best'
      ? `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`
      : 'bestvideo+bestaudio/best';



    const args = [
      '-f', format,
      '--merge-output-format', 'mp4',
      '-o', OUTPUT_PATH,
      '--no-playlist',
      '--force-overwrites',
      '--newline',
      url
    ];

    const process = execFile('yt-dlp', args);
    if (onCancel) onCancel(() => process.kill());

    process.stdout.on('data', (data) => {
      const line = data.toString();
      const percentMatch = line.match(/(\d+\.?\d*)%/);
      const sizeMatch = line.match(/of\s+([\d.]+\w+)/);
      const speedMatch = line.match(/at\s+([\d.]+\w+\/s)/);
      const downloadedMatch = line.match(/(\d+\.?\d*\w+)\s+at/);
      if (percentMatch) {
        onProgress(parseFloat(percentMatch[1]), {
          total: sizeMatch ? sizeMatch[1] : null,
          speed: speedMatch ? speedMatch[1] : null,
          downloaded: downloadedMatch ? downloadedMatch[1] : null
        });
      }
    });

    process.on('close', (code) => {
      if (code === 0) resolve('Done');
      else reject(new Error('Download failed'));
    });

    process.on('error', reject);
  });
}

function downloadAudioWithProgress(url, onProgress, onCancel) {
  return new Promise((resolve, reject) => {


    const args = [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', OUTPUT_PATH,
      '--no-playlist',
      '--force-overwrites',
      '--newline',
      url
    ];

    const process = execFile('yt-dlp', args);
    if (onCancel) onCancel(() => process.kill());

    process.stdout.on('data', (data) => {
      const line = data.toString();
      const percentMatch = line.match(/(\d+\.?\d*)%/);
      const sizeMatch = line.match(/of\s+([\d.]+\w+)/);
      const speedMatch = line.match(/at\s+([\d.]+\w+\/s)/);
      const downloadedMatch = line.match(/(\d+\.?\d*\w+)\s+at/);
      if (percentMatch) {
        onProgress(parseFloat(percentMatch[1]), {
          total: sizeMatch ? sizeMatch[1] : null,
          speed: speedMatch ? speedMatch[1] : null,
          downloaded: downloadedMatch ? downloadedMatch[1] : null
        });
      }
    });

    process.on('close', (code) => {
      if (code === 0) resolve('Done');
      else reject(new Error('Download failed'));
    });

    process.on('error', reject);
  });
}

function downloadThumbnail(url) {


  return runYtDlp([
    '--write-thumbnail',
    '--convert-thumbnails', 'jpg',
    '--force-overwrites',
    '--skip-download',
    '-o', THUMB_PATH,
    '--no-playlist',
    url
  ]);
}

module.exports = {
  getVideoInfoAndFormats,
  downloadVideoWithProgress,
  downloadAudioWithProgress,
  downloadThumbnail
};