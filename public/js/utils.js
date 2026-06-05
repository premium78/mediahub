function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function showLoader(text) {
  document.getElementById('loader').style.display = 'block';
  document.getElementById('loaderText').innerText = text;
  document.getElementById('result').style.display = 'none';
  document.getElementById('videoOptions').style.display = 'none';
  document.getElementById('audioOptions').style.display = 'none';
}

function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶ YouTube';
  if (url.includes('tiktok.com')) return '🎵 TikTok';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return '📘 Facebook';
  if (url.includes('instagram.com')) return '📸 Instagram';
  return '🌐 Other Platform';
}

async function pasteUrl() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('urlInput').value = text;
  } catch {
    showToast('Please paste manually', 'error');
  }
}

// Unregister old Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}