function showToast(message, type, duration = 3500) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}
function showSuccessAnimation(msg) {
  if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 120]);

  // Confetti
  const container = document.getElementById('confettiContainer');
  if (container) {
    container.innerHTML = '';
    const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8'];
    for (let i = 0; i < 70; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (Math.random() * 1.5 + 1) + 's';
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      piece.style.width = (Math.random() * 8 + 6) + 'px';
      piece.style.height = (Math.random() * 8 + 6) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 3000);
    }
  }

  // Toast
  const toast = document.getElementById('successToastFinal');
  const text = document.getElementById('successToastText');
  if (toast && text) {
    text.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}