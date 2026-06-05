function toggleSettings(open) {
  const sheet = document.getElementById('settingsSheet');
  const overlay = document.getElementById('settingsOverlay');

  if (open) {
    overlay.style.display = 'block';
    setTimeout(() => {
      sheet.classList.add('open');
      overlay.classList.add('open');
    }, 10);
    document.getElementById('defaultQuality').value =
      localStorage.getItem('defaultVideoQuality') || 'ask';
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
  if (isDark) {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    localStorage.setItem('appTheme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    localStorage.setItem('appTheme', 'light');
  }
}

function saveDefaultQuality() {
  const quality = document.getElementById('defaultQuality').value;
  localStorage.setItem('defaultVideoQuality', quality);
  showToast('⚙️ Settings saved!', 'success');
}

function initAppPreferences() {
  const savedTheme = localStorage.getItem('appTheme') || 'dark';
  const themeCheckBox = document.getElementById('themeToggle');

  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    if (themeCheckBox) themeCheckBox.checked = false;
  } else {
    document.body.classList.add('dark-mode');
    if (themeCheckBox) themeCheckBox.checked = true;
  }
}

window.addEventListener('DOMContentLoaded', initAppPreferences);