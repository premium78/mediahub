function saveToHistory(title, platform, quality, type, url) {
  const history = getHistory();
  const item = {
    id: Date.now(),
    title,
    platform,
    quality,
    type,
    url,
    time: new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  history.unshift(item);
  if (history.length > 50) history.pop();
  localStorage.setItem('downloadHistory', JSON.stringify(history));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('downloadHistory')) || [];
  } catch {
    return [];
  }
}

function toggleHistory(open) {
  const sheet = document.getElementById('historySheet');
  const overlay = document.getElementById('historyOverlay');

  if (open) {
    renderHistory();
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

function renderHistory() {
  const list = document.getElementById('historyList');
  const history = getHistory();
  list.innerHTML = '<div class="history-limit">📋 Last 50 downloads</div>';

  if (history.length === 0) {
    list.innerHTML = '<div class="history-empty">📭 No downloads yet</div>';
    return;
  }

  list.innerHTML += history.map(item => `
    <div class="history-item">
      <div class="history-item-title">${item.title}</div>
      <div class="history-item-meta">
        ${item.platform} • ${item.quality || 'Audio'} • ${item.type.toUpperCase()} • ${item.time}
      </div>
      <div class="history-item-actions">
        <button class="history-btn open-btn" onclick="window.open('${item.url}', '_blank')">🔗 Open</button>
        <button class="history-btn again-btn" onclick="downloadAgain('${item.url}')">⬇️ Again</button>
      </div>
    </div>
  `).join('');
}

function downloadAgain(url) {
  toggleHistory(false);
  document.getElementById('urlInput').value = url;
  showToast('Link loaded! Press Find Video', 'success');
}

function clearHistory() {
  if (confirm('Clear all download history?')) {
    localStorage.removeItem('downloadHistory');
    renderHistory();
    showToast('History cleared!', 'success');
  }
}