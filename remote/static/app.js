// Smart TV Web Remote Controller — Family Edition
const API_BASE = '';

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(25);
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function sendKey(key) {
  triggerHaptic();
  try {
    const res = await fetch(`${API_BASE}/api/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    return await res.json();
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

// Profile management
async function switchProfile(name) {
  triggerHaptic();
  try {
    const res = await fetch(`${API_BASE}/api/profile/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: name })
    });
    const data = await res.json();
    showToast(`Switched profile to ${name}`);
    updateProfiles();
    return data;
  } catch (err) {
    console.error('Profile switch error:', err);
  }
}

async function updateProfiles() {
  try {
    const res = await fetch(`${API_BASE}/api/profiles`);
    const data = await res.json();
    const active = data.active_profile || 'Sujay';

    document.querySelectorAll('.profile-chip').forEach(chip => {
      const p = chip.getAttribute('data-profile');
      if (p === active) chip.classList.add('active');
      else chip.classList.remove('active');
    });

    if (data.profiles) {
      data.profiles.forEach(p => {
        const id = 'time-' + p.name.replace(/\s+/g, '');
        const el = document.getElementById(id);
        if (el) el.textContent = p.watch_time;
      });
    }
  } catch (e) {
    console.warn('Profile poll error', e);
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

// Wallpaper upload from Photos
const photoInput = document.getElementById('photoInput');
document.getElementById('btnUploadWp').addEventListener('click', () => {
  photoInput.click();
});

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  showToast('Optimizing and uploading...');
  triggerHaptic();

  // Resize using Canvas to 1920x1080 (16:9)
  const img = new Image();
  const reader = new FileReader();

  reader.onload = (evt) => {
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Center crop to 16:9
      const imgAspect = img.width / img.height;
      const targetAspect = 1920 / 1080;
      let drawW, drawH, drawX, drawY;

      if (imgAspect > targetAspect) {
        drawH = 1080;
        drawW = 1080 * imgAspect;
        drawX = (1920 - drawW) / 2;
        drawY = 0;
      } else {
        drawW = 1920;
        drawH = 1920 / imgAspect;
        drawX = 0;
        drawY = (1080 - drawH) / 2;
      }

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      canvas.toBlob(async (blob) => {
        try {
          const res = await fetch(`${API_BASE}/api/wallpaper`, {
            method: 'POST',
            headers: { 'Content-Type': 'image/jpeg' },
            body: blob
          });
          const result = await res.json();
          if (result.success) {
            showToast('🎉 Wallpaper live on TV!');
          } else {
            showToast('Upload failed: ' + result.error);
          }
        } catch (err) {
          showToast('Error uploading wallpaper');
          console.error(err);
        }
      }, 'image/jpeg', 0.88);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

// Reset Wallpaper
document.getElementById('btnResetWp').addEventListener('click', async () => {
  triggerHaptic();
  try {
    const res = await fetch(`${API_BASE}/api/wallpaper/reset`, { method: 'POST' });
    const result = await res.json();
    showToast('Wallpaper reset to dark theme');
  } catch (err) {
    console.error(err);
  }
});

// Bind Profile Chips
document.querySelectorAll('.profile-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const profile = chip.getAttribute('data-profile');
    switchProfile(profile);
  });
});

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
  if (text) sendText(text);
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

// Desktop Keyboard Arrow Keys
window.addEventListener('keydown', (e) => {
  if (keyboardModal.classList.contains('active')) return;
  if (e.key === 'ArrowUp') sendKey('UP');
  else if (e.key === 'ArrowDown') sendKey('DOWN');
  else if (e.key === 'ArrowLeft') sendKey('LEFT');
  else if (e.key === 'ArrowRight') sendKey('RIGHT');
  else if (e.key === 'Enter') sendKey('OK');
  else if (e.key === 'Backspace' || e.key === 'Escape') sendKey('BACK');
});

// Polling
updateStatus();
updateProfiles();
setInterval(() => {
  updateStatus();
  updateProfiles();
}, 4000);
