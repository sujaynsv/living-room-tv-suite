// Smart TV Web Remote Controller
const API_BASE = '';

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(25);
  }
}

async function sendKey(key) {
  triggerHaptic();
  try {
    const res = await fetch(`${API_BASE}/api/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Key error:', err);
  }
}

async function launchApp(pkg) {
  triggerHaptic();
  try {
    const res = await fetch(`${API_BASE}/api/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package: pkg })
    });
    const data = await res.json();
    updateStatus();
    return data;
  } catch (err) {
    console.error('Launch error:', err);
  }
}

async function sendText(text) {
  if (!text) return;
  triggerHaptic();
  try {
    const res = await fetch(`${API_BASE}/api/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return await res.json();
  } catch (err) {
    console.error('Text error:', err);
  }
}

async function updateStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    const data = await res.json();
    const appEl = document.getElementById('currentApp');
    if (data.current_app) {
      const parts = data.current_app.split('.');
      const shortName = parts[parts.length - 1] || data.current_app;
      appEl.textContent = shortName === 'tvhome' ? 'Clean TV Home' : shortName;
    }
  } catch (e) {
    console.warn('Status poll error', e);
  }
}

// Bind Key Buttons
document.querySelectorAll('[data-key]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const key = btn.getAttribute('data-key');
    sendKey(key);
  });
});

// Bind App Chips
document.querySelectorAll('[data-app]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const pkg = btn.getAttribute('data-app');
    launchApp(pkg);
  });
});

// Header Buttons
document.getElementById('btnInput').addEventListener('click', () => sendKey('INPUT'));
document.getElementById('btnPower').addEventListener('click', () => sendKey('POWER'));

// Keyboard Modal
const keyboardModal = document.getElementById('keyboardModal');
const tvTextInput = document.getElementById('tvTextInput');
document.getElementById('btnKeyboard').addEventListener('click', () => {
  keyboardModal.classList.add('active');
  tvTextInput.value = '';
  tvTextInput.focus();
});
document.getElementById('btnCancelText').addEventListener('click', () => {
  keyboardModal.classList.remove('active');
});
document.getElementById('btnSendText').addEventListener('click', () => {
  const text = tvTextInput.value.trim();
  if (text) {
    sendText(text);
  }
  keyboardModal.classList.remove('active');
});
tvTextInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = tvTextInput.value.trim();
    if (text) sendText(text);
    keyboardModal.classList.remove('active');
  }
});

// Screen Preview Modal
const screenModal = document.getElementById('screenModal');
const liveScreenImg = document.getElementById('liveScreenImg');
document.getElementById('btnPreview').addEventListener('click', () => {
  liveScreenImg.src = `${API_BASE}/api/screenshot?t=${Date.now()}`;
  screenModal.classList.add('active');
});
document.getElementById('btnClosePreview').addEventListener('click', () => {
  screenModal.classList.remove('active');
});
document.getElementById('btnRefreshScreen').addEventListener('click', () => {
  liveScreenImg.src = `${API_BASE}/api/screenshot?t=${Date.now()}`;
});

// Keyboard arrow key support on desktop/laptop
window.addEventListener('keydown', (e) => {
  if (keyboardModal.classList.contains('active')) return;
  if (e.key === 'ArrowUp') sendKey('UP');
  else if (e.key === 'ArrowDown') sendKey('DOWN');
  else if (e.key === 'ArrowLeft') sendKey('LEFT');
  else if (e.key === 'ArrowRight') sendKey('RIGHT');
  else if (e.key === 'Enter') sendKey('OK');
  else if (e.key === 'Backspace' || e.key === 'Escape') sendKey('BACK');
});

// Initial status fetch
updateStatus();
setInterval(updateStatus, 5000);
