const express = require('express');
const router = express.Router();
const {
  getVideoInfoAndFormats,
  downloadVideoWithProgress,
  downloadAudioWithProgress,
  downloadThumbnail
} = require('../services/ytdlp');

function validateUrl(url) {
  if (!url || url.length > 500) return false;
  try {
    const parsed = new URL(url);
    const allowed = [
      'youtube.com', 'www.youtube.com', 'youtu.be',
      'tiktok.com', 'www.tiktok.com', 'vm.tiktok.com',
      'vt.tiktok.com', 'm.tiktok.com',
      'facebook.com', 'www.facebook.com', 'fb.watch', 'fb.com',
      'instagram.com', 'www.instagram.com'
    ];
    return allowed.some(domain => parsed.hostname === domain);
  } catch { return false; }
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/info', async (req, res) => {
  const { url } = req.body;
  if (!validateUrl(url)) {
    return res.json({
      success: false,
      message: 'Please provide a valid YouTube, TikTok, Facebook or Instagram link.'
    });
  }
  try {
    const info = await getVideoInfoAndFormats(url);
    res.json({ success: true, ...info, url });
  } catch (err) {
    const msg = err.message;
    if (msg.includes('TIMEOUT')) return res.json({ success: false, message: 'Request timed out. Please try again.' });
    if (msg.includes('private') || msg.includes('Private')) return res.json({ success: false, message: 'This video is private.' });
    if (msg.includes('unavailable')) return res.json({ success: false, message: 'This video is unavailable.' });
    res.json({ success: false, message: 'Could not fetch video info.' });
  }
});

router.get('/progress', async (req, res) => {
  const { url, quality, type } = req.query;

  if (!validateUrl(url)) {
    return res.json({ success: false, message: 'Invalid URL.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const onProgress = (percent, info = {}) => {
    sendSSE(res, { type: 'progress', percent, ...info });
  };

  let killFn = null;
  const onCancel = (fn) => { killFn = fn; };

  req.on('close', () => {
    if (killFn) killFn();
  });

  try {
    if (type === 'audio') {
      await downloadAudioWithProgress(url, onProgress, onCancel);
    } else {
      await downloadVideoWithProgress(url, quality || 'best', onProgress, onCancel);
    }
    sendSSE(res, { type: 'done', message: '✅ Download Complete!', downloadReady: true });
  } catch (err) {
    const msg = err.message || '';
    let errorMsg = '❌ Download failed. Please try again.';
    if (msg.includes('private') || msg.includes('Private')) errorMsg = '🔒 This video is private.';
    else if (msg.includes('age') || msg.includes('Age')) errorMsg = '🔞 Age restricted content.';
    else if (msg.includes('unavailable')) errorMsg = '❌ This video is unavailable.';
    else if (msg.includes('copyright')) errorMsg = '⚠️ This video is not available due to copyright.';
    else if (msg.includes('killed') || msg.includes('SIGTERM')) errorMsg = '⛔ Download was cancelled.';
    sendSSE(res, { type: 'error', message: errorMsg });
  }

  res.end();
});

router.post('/thumbnail', async (req, res) => {
  const { url } = req.body;

  if (!validateUrl(url)) {
    return res.json({ success: false, message: 'Invalid URL.' });
  }

  try {
    await downloadThumbnail(url);
    res.json({ success: true, message: '✅ Thumbnail saved to Download folder!' });
  } catch (err) {
    res.json({ success: false, message: '❌ Could not download thumbnail.' });
  }
});
router.get('/thumbnail-progress', async (req, res) => {
  const { url } = req.query;
  if (!validateUrl(url)) return res.json({ success: false, message: 'Invalid URL.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    res.write(`data: ${JSON.stringify({ type: 'progress', percent: 30 })}\n\n`);
    await downloadThumbnail(url);
    res.write(`data: ${JSON.stringify({ type: 'progress', percent: 100 })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', message: '✅ Thumbnail saved!' })}\n\n`);
  } catch {
    res.write(`data: ${JSON.stringify({ type: 'error', message: '❌ Failed.' })}\n\n`);
  }
  res.end();
});
router.get('/file', async (req, res) => {
  const { url, type, quality } = req.query;

  if (!validateUrl(url)) {
    return res.json({ success: false, message: 'Invalid URL.' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const DOWNLOAD_DIR = path.join(os.tmpdir(), 'mediahub');

    const files = fs.readdirSync(DOWNLOAD_DIR);
    if (files.length === 0) {
      return res.json({ success: false, message: 'File not found.' });
    }

    const ext = type === 'audio' ? '.mp3' : '.mp4';
    const file = files.find(f => f.endsWith(ext)) || files[files.length - 1];
    const filePath = path.join(DOWNLOAD_DIR, file);

    res.download(filePath, file, (err) => {
      if (!err) fs.unlinkSync(filePath);
    });
  } catch (err) {
    res.json({ success: false, message: 'Could not send file.' });
  }
});
module.exports = router;