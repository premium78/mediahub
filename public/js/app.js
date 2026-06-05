let videoUrl = '';

function buildQualityOptions(formats) {
  const select = document.getElementById('qualitySelect');
  select.innerHTML = '';
  formats.forEach(f => {
    const option = document.createElement('option');
    option.value = f.value;
    option.innerText = f.label;
    select.appendChild(option);
  });

  const savedQuality = localStorage.getItem('defaultVideoQuality') || 'ask';
  if (savedQuality !== 'ask') {
    const found = Array.from(select.options).some(opt => opt.value === savedQuality);
    if (found) select.value = savedQuality;
  }
}

function showVideoOptions() {
  document.getElementById('videoOptions').style.display = 'block';
  document.getElementById('audioOptions').style.display = 'none';
}

function showAudioOptions() {
  document.getElementById('audioOptions').style.display = 'block';
  document.getElementById('videoOptions').style.display = 'none';
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

async function getVideo() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return showToast('Please enter a link first!', 'error');

  const allowed = ['youtube.com', 'youtu.be', 'tiktok.com', 'facebook.com', 'fb.watch', 'instagram.com'];
  const isValid = allowed.some(d => url.includes(d));
  if (!isValid) return showToast('Please provide a YouTube, TikTok, Facebook or Instagram link!', 'error');

  videoUrl = url;
  showLoader('Fetching video information...');

  try {
    const res = await fetch('/api/media/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    hideLoader();

    if (data.success) {
      document.getElementById('thumbnail').src = data.thumbnail;
      document.getElementById('title').innerText = data.title;
      document.getElementById('platformTag').innerText = detectPlatform(url);
      buildQualityOptions(data.formats);
      document.getElementById('result').style.display = 'block';

      const savedQuality = localStorage.getItem('defaultVideoQuality') || 'ask';
      if (savedQuality !== 'ask') showVideoOptions();
    } else {
      showToast(data.message, 'error');
    }
  } catch {
    hideLoader();
    showToast('Please check your internet connection!', 'error');
  }
}

function downloadWithProgress(url, params, btnId, btnText, barId, percentId, containerId, optionsId) {
  const btn = document.getElementById(btnId);
  btn.disabled = true;
  btn.innerText = '⏳ Starting...';

  startProgress(barId, percentId, containerId);
  document.getElementById(optionsId).style.display = 'block';

  const query = new URLSearchParams(params).toString();
  const source = new EventSource(`/api/media/progress?${query}`);

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'progress') {
      updateProgress(barId, percentId, data.percent);
      btn.innerText = `⏳ ${Math.round(data.percent)}%`;
    }

    if (data.type === 'done') {
      source.close();
      updateProgress(barId, percentId, 100);
      btn.innerText = btnText;
      btn.disabled = false;
      showToast(data.message, 'success');
      setTimeout(() => hideProgress(containerId), 2000);
    }

    if (data.type === 'error') {
      source.close();
      btn.innerText = btnText;
      btn.disabled = false;
      hideProgress(containerId);
      showToast(data.message, 'error');
    }
  };

  source.onerror = () => {
    source.close();
    btn.innerText = btnText;
    btn.disabled = false;
    hideProgress(containerId);
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
    'videoBar',
    'videoPercent',
    'videoProgress',
    'videoOptions'
  );
}

function downloadAudio() {
  downloadWithProgress(
    videoUrl,
    { url: videoUrl, type: 'audio' },
    'audioBtn',
    '🎵 Download Audio',
    'audioBar',
    'audioPercent',
    'audioProgress',
    'audioOptions'
  );
}