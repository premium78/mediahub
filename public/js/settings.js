function toggleSettings(open) {
  const sheet = document.getElementById('settingsSheet');
  const overlay = document.getElementById('settingsOverlay');

  if (open) {
    overlay.style.display = 'block';
    setTimeout(() => {
      sheet.classList.add('open');
      overlay.classList.add('open');
    }, 10);
  } else {
    sheet.classList.remove('open');
    overlay.classList.remove('open');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 350);
  }
}

function toggleTheme() {
  const isDark = document.getElementById('themeToggle').checked;
  const theme = isDark ? 'dark' : 'light';
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function loadSettings() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = theme === 'dark';
}

window.addEventListener('DOMContentLoaded', loadSettings);