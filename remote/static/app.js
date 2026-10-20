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
  const files = Array.from(e.target.files);
  if (!files.length) return;

  showToast(`Uploading ${files.length} photo(s) to TV Slideshow...`);
  triggerHaptic();

  let uploaded = 0;
  for (const file of files) {
    try {
      const blob = await new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (evt) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
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
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.88);
          };
          img.onerror = reject;
          img.src = evt.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${API_BASE}/api/wallpapers/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob
      });
      const result = await res.json();
      if (result.success) uploaded++;
    } catch (err) {
      console.error('Failed uploading photo:', file.name, err);
    }
  }

  if (uploaded > 0) {
    showToast(`🎉 Added ${uploaded} photo(s) to TV Slideshow!`);
  } else {
    showToast('Failed to upload photos');
  }
  photoInput.value = '';
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

// Device Switcher
const tvDeviceSelect = document.getElementById('tvDeviceSelect');

async function updateDevices() {
  if (!tvDeviceSelect) return;
  try {
    const res = await fetch(`${API_BASE}/api/devices`);
    const data = await res.json();
    if (tvDeviceSelect.options.length === 0 && data.devices) {
      data.devices.forEach(dev => {
        const opt = document.createElement('option');
        opt.value = dev.id;
        opt.textContent = dev.name;
        tvDeviceSelect.appendChild(opt);
      });
    }
    if (data.active_device) {
      tvDeviceSelect.value = data.active_device;
    }
  } catch (e) {
    console.warn('Devices fetch error', e);
  }
}

if (tvDeviceSelect) {
  tvDeviceSelect.addEventListener('change', async (e) => {
    const selectedId = e.target.value;
    triggerHaptic();
    try {
      const res = await fetch(`${API_BASE}/api/devices/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: selectedId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Connected to ${data.device.name}`);
        updateStatus();
        updateProfiles();
      }
    } catch (err) {
      showToast('Failed to switch device');
      console.error(err);
    }
  });
}

// Polling
updateDevices();
updateStatus();
updateProfiles();
setInterval(() => {
  updateStatus();
  updateProfiles();
}, 4000);

// Multi-Wallpaper Slideshow Upload
const multiWallpaperInput = document.getElementById('multiWallpaperInput');
if (multiWallpaperInput) {
  multiWallpaperInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    showToast(`Optimizing & uploading ${files.length} photos...`);
    let count = 0;
    for (const file of files) {
      const blob = await optimizeImage(file);
      try {
        await fetch(`${API_BASE}/api/wallpapers/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob
        });
        count++;
      } catch (err) {}
    }
    showToast(`Added ${count} photos to TV Slideshow!`);
    multiWallpaperInput.value = '';
  });
}

// AI Assistant Voice Drawer & Beam
const aiModal = document.getElementById('aiModal');
const btnOpenAi = document.getElementById('btnOpenAi');
const btnCloseAi = document.getElementById('btnCloseAi');
const btnMic = document.getElementById('btnMic');
const micStatus = document.getElementById('micStatus');
const aiQueryInput = document.getElementById('aiQueryInput');
const btnAiAsk = document.getElementById('btnAiAsk');
const aiResultBox = document.getElementById('aiResultBox');
const aiResponseText = document.getElementById('aiResponseText');
const btnBeamToTv = document.getElementById('btnBeamToTv');

let currentIntentUrl = '';

if (btnOpenAi) {
  btnOpenAi.addEventListener('click', () => {
    aiModal.classList.add('active');
    aiQueryInput.focus();
  });
}
if (btnCloseAi) {
  btnCloseAi.addEventListener('click', () => {
    aiModal.classList.remove('active');
  });
}

let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';

  recognition.onstart = () => {
    btnMic.classList.add('listening');
    micStatus.textContent = 'Listening... Speak now';
  };
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    aiQueryInput.value = transcript;
    micStatus.textContent = `Heard: "${transcript}"`;
    btnMic.classList.remove('listening');
    executeAiQuery(transcript);
  };
  recognition.onerror = () => {
    btnMic.classList.remove('listening');
    micStatus.textContent = 'Voice error. Tap mic or type below.';
  };
  recognition.onend = () => {
    btnMic.classList.remove('listening');
  };
}

if (btnMic) {
  btnMic.addEventListener('click', () => {
    if (!recognition) {
      alert('Speech recognition not supported in this browser. Please type your query.');
      return;
    }
    try {
      recognition.start();
    } catch (e) {
      recognition.stop();
    }
  });
}

async function executeAiQuery(query) {
  if (!query) return;
  micStatus.textContent = 'Thinking...';
  try {
    const res = await fetch(`${API_BASE}/api/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        profile: activeProfile
      })
    });
    const data = await res.json();
    if (data.success) {
      currentIntentUrl = data.intent_url;
      aiResponseText.innerHTML = `<strong>AI Suggestion (${data.profile}):</strong><p>${data.reply}</p><small>Search: "${data.search_query}"</small>`;
      aiResultBox.style.display = 'block';
      micStatus.textContent = 'Recommendation ready!';
    }
  } catch (err) {
    micStatus.textContent = 'Could not get AI recommendation.';
  }
}

if (btnAiAsk) {
  btnAiAsk.addEventListener('click', () => {
    const q = aiQueryInput.value.trim();
    if (q) executeAiQuery(q);
  });
}

if (aiQueryInput) {
  aiQueryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = aiQueryInput.value.trim();
      if (q) executeAiQuery(q);
    }
  });
}

document.querySelectorAll('.tag-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.tag;
    aiQueryInput.value = tag;
    executeAiQuery(tag);
  });
});

if (btnBeamToTv) {
  btnBeamToTv.addEventListener('click', async () => {
    if (!currentIntentUrl) return;
    try {
      await fetch(`${API_BASE}/api/beam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent_url: currentIntentUrl })
      });
      showToast('Beamed to TV!');
      aiModal.classList.remove('active');
    } catch (err) {
      showToast('Failed to beam to TV');
    }
  });
}

const btnOpenAiBottom = document.getElementById('btnOpenAiBottom');
if (btnOpenAiBottom) {
  btnOpenAiBottom.addEventListener('click', () => {
    aiModal.classList.add('active');
    aiQueryInput.focus();
  });
}
