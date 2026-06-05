const { execFile } = require('child_process');

const OUTPUT_PATH = '/sdcard/Download/%(title)s.%(ext)s';

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

  return { title: data.title, thumbnail: data.thumbnail, formats };
}

function downloadVideoWithProgress(url, quality, onProgress) {
  return new Promise((resolve, reject) => {
    const format = quality && quality !== 'best'
      ? `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`
      : 'bestvideo+bestaudio/best';

    const args = [
      '-f', format,
      '--merge-output-format', 'mp4',
      '-o', OUTPUT_PATH,
      '--no-playlist',
      '--newline',
      url
    ];

    const process = execFile('yt-dlp', args);

    process.stdout.on('data', (data) => {
      const line = data.toString();
      const match = line.match(/(\d+\.?\d*)%/);
      if (match) {
        const percent = parseFloat(match[1]);
        onProgress(percent);
      }
    });

    process.on('close', (code) => {
      if (code === 0) resolve('Done');
      else reject(new Error('Download failed'));
    });

    process.on('error', reject);
  });
}

function downloadAudioWithProgress(url, onProgress) {
  return new Promise((resolve, reject) => {
    const args = [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', OUTPUT_PATH,
      '--no-playlist',
      '--newline',
      url
    ];

    const process = execFile('yt-dlp', args);

    process.stdout.on('data', (data) => {
      const line = data.toString();
      const match = line.match(/(\d+\.?\d*)%/);
      if (match) {
        const percent = parseFloat(match[1]);
        onProgress(percent);
      }
    });

    process.on('close', (code) => {
      if (code === 0) resolve('Done');
      else reject(new Error('Download failed'));
    });

    process.on('error', reject);
  });
}

module.exports = {
  getVideoInfoAndFormats,
  downloadVideoWithProgress,
  downloadAudioWithProgress
};