const express = require('express');
const router = express.Router();
const {
  getVideoInfoAndFormats,
  downloadVideoWithProgress,
  downloadAudioWithProgress
} = require('../services/ytdlp');

function validateUrl(url) {
  if (!url || url.length > 500) return false;
  try {
    const parsed = new URL(url);
    const allowed = [
      'youtube.com', 'www.youtube.com', 'youtu.be',
      'tiktok.com', 'www.tiktok.com',
      'facebook.com', 'www.facebook.com', 'fb.watch',
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

  const onProgress = (percent) => {
    sendSSE(res, { type: 'progress', percent });
  };

  try {
    if (type === 'audio') {
      await downloadAudioWithProgress(url, onProgress);
    } else {
      await downloadVideoWithProgress(url, quality || 'best', onProgress);
    }
    sendSSE(res, { type: 'done', message: '✅ Download Complete! Check your Download folder.' });
  } catch (err) {
    sendSSE(res, { type: 'error', message: '❌ Download failed. Please try again.' });
  }

  res.end();
});

module.exports = router;