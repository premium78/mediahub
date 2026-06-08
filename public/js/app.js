// Background Queue State
const activeDownloads = {};
let videoUrl = '';
let videoTitle = '';
let videoPlatform = '';

function buildQualityOptions(formats) {
  const select = document.getElementById('qualitySelect');
  select.innerHTML = '';
  formats.forEach(f => {
    const option = document.createElement('option');
    option.value = f.value;
    option.innerText = f.label;
    select.appendChild(option);
  });
}

function showVideoOptions() {
  document.getElementById('videoOptions').style.display = 'block';
  document.getElementById('audioOptions').style.display = 'none';
  document.getElementById('thumbOptions').style.display = 'none';
}

function showAudioOptions() {
  document.getElementById('audioOptions').style.display = 'block';
  document.getElementById('videoOptions').style.display = 'none';
  document.getElementById('thumbOptions').style.display = 'none';
}
function showThumbOptions() {
  document.getElementById('thumbOptions').style.display = 'block';
  document.getElementById('videoOptions').style.display = 'none';
  document.getElementById('audioOptions').style.display = 'none';
}
function startProgress(barId, percentId, containerId) {
  document.getElementById(containerId).style.display = 'block';
  document.getElementById(barId).style.width = '0%';
  document.getElementById(percentId).innerText = '0%';
}

function updateProgress(barId, percentId, percent) {
  document.getElementById(barId).style.width = percent + '%';
  document.getElementById(percentId).innerText = Math.round(percent) + '%';
}

function hideProgress(containerId) {
  document.getElementById(containerId).style.display = 'none';
}
function resetDownloader() {
  document.getElementById('successCard').style.display = 'none';
  document.getElementById('result').style.display = 'block';
  document.getElementById('videoOptions').style.display = 'none';
  document.getElementById('audioOptions').style.display = 'none';
  document.getElementById('thumbOptions').style.display = 'none';
}
async function getVideo() {
  if (!navigator.onLine) {
    showToast('📡 No internet connection!', 'error', 3000);
    return;
  }
  document.getElementById('successCard').style.display = 'none';
  document.getElementById('urlError').style.display = 'none';
  document.getElementById('result').style.display = 'none';
  document.getElementById('videoOptions').style.display = 'none';
  document.getElementById('audioOptions').style.display = 'none';
  document.getElementById('thumbOptions').style.display = 'none';
  let url = document.getElementById('urlInput').value.trim();

  const urlMatch = url.match(/https?:\/\/[^\s]+/);
  if (urlMatch) url = urlMatch[0];

  if (!url) {
  document.getElementById('urlError').style.display = 'block';
  document.getElementById('urlError').querySelector('p').innerText = '⚠️ Please enter a URL link first!';
  return;
}

  const allowed = [
  'youtube.com', 'youtu.be',
  'tiktok.com', 'vm.tiktok.com', 'm.tiktok.com', 'vt.tiktok.com',
  'facebook.com', 'fb.watch', 'fb.com',
  'instagram.com'
];
  const isValid = allowed.some(d => url.includes(d));
  if (!isValid) {
  document.getElementById('urlError').style.display = 'block';
  return;
}

  videoUrl = url;
  document.getElementById('urlInput').value = url;
  showLoader('Analyzing your link...');

  try {
    const res = await fetch('/api/media/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    hideLoader();

    if (data.success) {
  videoTitle = data.title;
  videoPlatform = detectPlatform(url);
  document.getElementById('thumbnail').src = data.thumbnail;
  document.getElementById('title').innerText = data.title;
  document.getElementById('platformTag').innerText = videoPlatform;

  // Duration format করো
  const mins = Math.floor((data.duration || 0) / 60);
  const secs = String((data.duration || 0) % 60).padStart(2, '0');
  const duration = data.duration ? `⏱️ ${mins}:${secs}` : '';

  // Views format করো
  const views = data.view_count
    ? `👁️ ${data.view_count >= 1000000
        ? (data.view_count / 1000000).toFixed(1) + 'M'
        : data.view_count >= 1000
        ? (data.view_count / 1000).toFixed(1) + 'K'
        : data.view_count}`
    : '';

  // Uploader
  const uploader = data.uploader ? `👤 ${data.uploader}` : '';

  // Info দেখাও
  const infoEl = document.getElementById('videoInfo');
  if (infoEl) {
    infoEl.innerText = [uploader, duration, views].filter(Boolean).join('  •  ');
    infoEl.style.display = [uploader, duration, views].some(Boolean) ? 'block' : 'none';
  }

  buildQualityOptions(data.formats);
  document.getElementById('result').style.display = 'block';
  document.getElementById('videoOptions').style.display = 'none';
  document.getElementById('audioOptions').style.display = 'none';
} else {
      showToast(data.message, 'error');
    }
  } catch {
    hideLoader();
    showToast('Please check your internet connection!', 'error');
  }
}

function downloadWithProgress(url, params, btnId, btnText, loaderText, barId, percentId, containerId, optionsId, historyType, historyQuality) {
  const dlId = Date.now();
  activeDownloads[dlId] = {
    title:    videoTitle,
    platform: videoPlatform,
    type:     historyType,
    quality:  historyQuality,
    percent:  0,
    optionsId: optionsId,
    btnId:    btnId,
    btnText:  btnText,
    inBackground: true
  };

  const msg = historyType === 'mp4'
    ? '⬇️ Video downloading in background...'
    : '⬇️ Audio downloading in background...';
  showToast(msg, 'success', 2000);
  history.pushState(null, '', location.href);

  document.getElementById('queueDot').classList.add('blinking');
  document.getElementById('urlInput').value = '';
  document.getElementById('result').style.display = 'none';
  document.getElementById('videoOptions').style.display = 'none';
  document.getElementById('audioOptions').style.display = 'none';
  document.getElementById('thumbOptions').style.display = 'none';
  videoUrl = '';

  const query = new URLSearchParams(params).toString();
  const source = new EventSource(`/api/media/progress?${query}&_=${Date.now()}`);
  activeDownloads[dlId].source = source;

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'progress') {
      if (activeDownloads[dlId]) {
        activeDownloads[dlId].percent = data.percent;
        activeDownloads[dlId].speed = data.speed || null;
        activeDownloads[dlId].downloaded = data.downloaded || null;
        activeDownloads[dlId].total = data.total || null;
      }
    }

    if (data.type === 'done') {
      source.close();
      saveToHistory(videoTitle, videoPlatform, historyQuality, historyType, videoUrl);
      const doneMsg = historyType === 'mp4'
        ? '✅ Video Download Complete!'
        : '✅ Audio Download Complete!';
      showSuccessAnimation(doneMsg);
      if (data.downloadReady) {
  const downloadUrl = `/api/media/file?url=${encodeURIComponent(params.url)}&type=${params.type}&quality=${params.quality || ''}`;
  window.location.href = downloadUrl;
}
      if (activeDownloads[dlId]) {
        activeDownloads[dlId].percent = 100;
        setTimeout(() => {
          delete activeDownloads[dlId];
          if (Object.keys(activeDownloads).length === 0) {
            document.getElementById('queueDot').classList.remove('blinking');
            const warning = document.getElementById('dlWarningToast');
            if (warning) warning.remove();
          }
        }, 500);
      }
    }

    if (data.type === 'error') {
      source.close();
      delete activeDownloads[dlId];
      if (Object.keys(activeDownloads).length === 0) {
        document.getElementById('queueDot').classList.remove('blinking');
      }
      showToast(data.message, 'error');
    }
  };

  source.onerror = () => {
    source.close();
    delete activeDownloads[dlId];
    if (Object.keys(activeDownloads).length === 0) {
      document.getElementById('queueDot').classList.remove('blinking');
    }
    showToast('Connection lost. Please try again.', 'error');
  };
}

function downloadVideo() {
  const quality = document.getElementById('qualitySelect').value;
  downloadWithProgress(
    videoUrl,
    { url: videoUrl, quality, type: 'video' },
    'downloadBtn',
    '⬇️ Download Now',
    'Downloading Video...',
    'videoBar',
    'videoPercent',
    'videoProgress',
    'videoOptions',
    'mp4',
    quality + 'p'
  );
}

function downloadAudio() {
  downloadWithProgress(
    videoUrl,
    { url: videoUrl, type: 'audio' },
    'audioBtn',
    '🎵 Download Audio',
    'Downloading Audio...',
    'audioBar',
    'audioPercent',
    'audioProgress',
    'audioOptions',
    'mp3',
    'Audio'
  );
}

function downloadThumbnail() {
  const thumbUrl = videoUrl;
  const dlId = Date.now();

  activeDownloads[dlId] = {
    title: videoTitle,
    platform: videoPlatform,
    type: 'thumbnail',
    quality: 'JPG',
    percent: 0,
    inBackground: true
  };

  showToast('⬇️ Thumbnail downloading in background...', 'success', 2000);
  history.pushState(null, '', location.href);
  document.getElementById('queueDot').classList.add('blinking');
  document.getElementById('result').style.display = 'none';
  document.getElementById('thumbOptions').style.display = 'none';
  document.getElementById('urlInput').value = '';
  videoUrl = '';

  const source = new EventSource(`/api/media/thumbnail-progress?url=${encodeURIComponent(thumbUrl)}`);
  activeDownloads[dlId].source = source;

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'progress') {
      if (activeDownloads[dlId]) activeDownloads[dlId].percent = data.percent;
    }

    if (data.type === 'done') {
      source.close();
      saveToHistory(videoTitle, videoPlatform, 'JPG', 'thumbnail', thumbUrl);
      showSuccessAnimation('🖼️ Thumbnail Downloaded!');
      if (activeDownloads[dlId]) {
        activeDownloads[dlId].percent = 100;
        setTimeout(() => {
          delete activeDownloads[dlId];
          if (Object.keys(activeDownloads).length === 0) {
            document.getElementById('queueDot').classList.remove('blinking');
            const warning = document.getElementById('dlWarningToast');
            if (warning) warning.remove();
          }
        }, 500);
      }
    }

    if (data.type === 'error') {
      source.close();
      delete activeDownloads[dlId];
      if (Object.keys(activeDownloads).length === 0) {
        document.getElementById('queueDot').classList.remove('blinking');
      }
      showToast(data.message, 'error');
    }
  };

  source.onerror = () => {
    source.close();
    delete activeDownloads[dlId];
    if (Object.keys(activeDownloads).length === 0) {
      document.getElementById('queueDot').classList.remove('blinking');
    }
    showToast('Connection lost. Please try again.', 'error');
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('url');
  if (url) {
    document.getElementById('urlInput').value = url;
    showToast('Link loaded! Press Find Video', 'success');
  }
});
// ── DISMISS LISTENER ──
function activateDismissListener(dlId) {
  function onTap(e) {
    const d = activeDownloads[dlId];
    if (!d) return;
    d.inBackground = true;

    const optEl = document.getElementById(d.optionsId);
    const resEl = document.getElementById('result');
    if ((optEl && optEl.contains(e.target)) ||
        (resEl && resEl.contains(e.target))) return;

    dismissToBackground(dlId);
    document.removeEventListener('click', onTap);
    document.removeEventListener('touchstart', onTap);
  }
  document.addEventListener('click', onTap);
  document.addEventListener('touchstart', onTap);
}

// ── DISMISS TO BACKGROUND ──
function dismissToBackground(dlId) {
  const d = activeDownloads[dlId];
  if (!d) return;
// Progress bar + options সব hide করো
  ['videoProgress', 'audioProgress', 'thumbProgress'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  ['videoOptions', 'audioOptions', 'thumbOptions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Button text reset করো
  const btn = document.getElementById(d.btnId);
  if (btn) {
    btn.innerText = d.btnText;
    btn.disabled = false;
  }

  // 1. Result card fade out
  const result = document.getElementById('result');
  result.classList.add('fading-out');
  setTimeout(() => {
    result.style.display = 'none';
    result.classList.remove('fading-out');
    document.getElementById(d.optionsId).style.display = 'none';
  }, 480);

  // 2. Hint লুকাও
  if (d.hintId) document.getElementById(d.hintId).style.display = 'none';

  // 3. Header dot ব্লিঙ্ক শুরু
  document.getElementById('queueDot').classList.add('blinking');

  // 4. Toast
  showToast('✅ Moved to background queue!', 'success');

  // 5. Input fresh করো
  document.getElementById('urlInput').value = '';
  videoUrl = '';
}

// ── QUEUE PANEL ──
function openQueue() {
  renderQueue();
  const overlay = document.getElementById('queueOverlay');
  const sheet   = document.getElementById('queueSheet');
  overlay.classList.add('open');
  setTimeout(() => sheet.classList.add('open'), 10);
}

function closeQueue() {
  document.getElementById('queueSheet').classList.remove('open');
  document.getElementById('queueOverlay').classList.remove('open');
}

function renderQueue() {
  const list = document.getElementById('queueList');
  const keys = Object.keys(activeDownloads);

  if (keys.length === 0) {
    list.innerHTML = '<div class="queue-empty">📭 No active downloads</div>';
    return;
  }

  list.innerHTML = keys.map(id => {
    const d = activeDownloads[id];
    const pct = Math.round(d.percent || 0);
    const thumb = document.getElementById('thumbnail')?.src || '';
    return `
      <div class="queue-item" id="qi-${id}">
        <div class="queue-item-top">
          <img class="queue-thumb" src="${thumb}" alt="">
          <div class="queue-info">
            <div class="queue-title">${d.title}</div>
            <div class="queue-meta">${d.platform} • ${d.quality} • ${d.type.toUpperCase()}</div>
          </div>
          <div class="queue-percent" id="qpct-${id}">${pct}%</div>
        </div>
        <div class="q-bar-bg">
          <div class="q-bar-fill" id="qbar-${id}" style="width:${pct}%"></div>
        </div>
        
        <div class="queue-actions">
          
          <button class="q-btn q-cancel-btn" onclick="cancelDownload(${id})">✕ Cancel</button>
        </div>
      </div>`;
  }).join('');

// Live percent sync + auto remove on 100%
  keys.forEach(id => {
    const sync = setInterval(() => {
      const d = activeDownloads[id];
      if (!d) { clearInterval(sync); return; }

      const p = Math.round(d.percent || 0);
      const pctEl = document.getElementById('qpct-' + id);
      const barEl = document.getElementById('qbar-' + id);
      if (pctEl) pctEl.innerText = p + '%';
      if (barEl) barEl.style.width = p + '%';
      

      // 100% হলে auto remove
      if (p >= 100) {
        clearInterval(sync);
        setTimeout(() => {
          delete activeDownloads[id];
          document.getElementById('qi-' + id)?.remove();
          if (Object.keys(activeDownloads).length === 0) {
            document.getElementById('queueDot').classList.remove('blinking');
            document.getElementById('queueList').innerHTML =
              '<div class="queue-empty">📭 No active downloads</div>';
          }
        }, 500);
      }
    }, 600);
  });
}

function cancelDownload(id) {
  const d = activeDownloads[id];
  if (!d) return;
  if (d.source) d.source.close();
  delete activeDownloads[id];
  document.getElementById('qi-' + id)?.remove();
  if (Object.keys(activeDownloads).length === 0) {
    document.getElementById('queueDot').classList.remove('blinking');
    document.getElementById('queueList').innerHTML =
      '<div class="queue-empty">📭 No active downloads</div>';
  }
  showToast('❌ Download cancelled!', 'error', 2500);
}
// Back button warning

window.addEventListener('popstate', () => {
  if (Object.keys(activeDownloads).length > 0) {
    history.pushState(null, '', location.href);
    if (navigator.vibrate) navigator.vibrate([200]);
    showDownloadWarning();
  }
});

function showDownloadWarning() {
  const existing = document.getElementById('dlWarningToast');
  if (existing) return;

  const toast = document.createElement('div');
  toast.id = 'dlWarningToast';
  toast.innerHTML = `
    <div style="font-size:15px; font-weight:700; margin-bottom:8px;">⚠️ Download in Progress!</div>
    <div style="font-size:13px; opacity:0.9; margin-bottom:14px;">Leaving now will cancel your download. What would you like to do?</div>
    <div style="display:flex; gap:8px;">
      <button onclick="document.getElementById('dlWarningToast').remove()" style="flex:1; padding:10px; border:2px solid white; background:transparent; color:white; border-radius:10px; font-weight:600; font-size:13px;">Keep Downloading</button>
      <button onclick="cancelAllAndLeave()" style="flex:1; padding:10px; background:white; color:#ef4444; border:none; border-radius:10px; font-weight:700; font-size:13px;">Cancel & Leave</button>
    </div>
  `;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ef4444;
    color: white;
    padding: 16px;
    border-radius: 16px;
    font-size: 14px;
    z-index: 99999;
    box-shadow: 0 8px 24px rgba(239,68,68,0.4);
    width: 88vw;
    max-width: 360px;
    animation: slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);
  `;
  document.body.appendChild(toast);
}
function handleBack() {
  if (Object.keys(activeDownloads).length > 0) {
    if (navigator.vibrate) navigator.vibrate([200]);
    showDownloadWarning();
  } else {
    window.location.href = 'index.html';
  }
}
function cancelAllAndLeave() {
  Object.keys(activeDownloads).forEach(id => cancelDownload(id));
  window.location.href = 'index.html';
}
// Internet connection check
window.addEventListener('online', () => {
  showToast('✅ Internet connected!', 'success', 2000);
  const offlineMsg = document.getElementById('offlineMsg');
  if (offlineMsg) offlineMsg.remove();
});

window.addEventListener('offline', () => {
  if (navigator.vibrate) navigator.vibrate([200]);
  showToast('📡 No internet connection!', 'error', 3000);
});