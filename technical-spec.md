# Technical Specification — Smart TV Suite

## 1. System Architecture

The codebase is organized as a clean monorepo:

```
smart-tv-suite/
├── product-requirements.md
├── technical-spec.md
├── README.md
├── launcher/                  # Android TV Leanback Launcher (Kotlin/Gradle)
│   ├── app/
│   │   └── src/main/res/values/config.xml # Pinned apps, hardware tuning
│   ├── build.gradle
│   ├── gradlew
│   └── ...
├── remote/                    # iPhone / iPad Touch Web Remote
│   ├── server.py              # Lightweight HTTP & WebSocket API bridge to ADB
│   └── static/
│       ├── index.html         # Modern touch UI (haptic, dark glassmorphism)
│       ├── style.css          # iOS HIG touch styling, responsive
│       └── app.js             # D-Pad, swipe gestures, keypress handlers
├── debloat/                   # TV profile & safe management scripts
│   ├── thomson-debloat.txt    # Curated package list for Thomson SWTV-20
│   ├── apply-debloat.sh       # Script to disable telemetry/ads
│   ├── restore-stock.sh       # Script to rollback to factory state
│   └── tv.py                  # Direct ADB communication module
└── config.env                 # Centralized configuration (TV_IP=192.168.1.8, PORT=5555)
```

## 2. Component Specifications

### 2.1 Android Launcher Component (`/launcher`)
- **Language**: Kotlin, Android SDK 29-34
- **Configuration** (`config.xml`):
  - Dock: `com.netflix.ninja`, `com.google.android.youtube.tv`, `in.startv.hotstar`, `com.amazon.amazonvideo.livingroom`
  - Tuner: `com.smartdevice.livetv`
  - Reduced Motion: `true` (tailored for MediaTek MT5895/SW4H Mali GPU)
- **Build Output**: `launcher/app/build/outputs/apk/release/app-release.apk`

### 2.2 iPhone/iPad Web Remote Component (`/remote`)
- **Backend (`remote/server.py`)**:
  - Python HTTP server using built-in `http.server` or `asyncio`/FastAPI/Flask.
  - Endpoints:
    - `POST /api/key`: Triggers `adb shell input keyevent <keycode>`
    - `POST /api/text`: Triggers `adb shell input text <escaped_text>`
    - `POST /api/launch`: Triggers `adb shell monkey -p <package> -c android.intent.category.LAUNCHER 1`
    - `GET /api/status`: Queries current foreground package and TV power status
    - `GET /api/screenshot`: Returns real-time screen capture
  - Serves static assets on `0.0.0.0:8080`.
- **Frontend (`remote/static/`)**:
  - High-performance, touch-optimized HTML5/CSS3/Vanilla JS (zero framework overhead).
  - Apple Web Clip meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) allowing the user to "Add to Home Screen" on iPhone/iPad to look and feel like a native iOS app.
  - Haptic feedback via `navigator.vibrate` (where supported).
  - Virtual touchpad / swipe navigation and dedicated D-pad buttons.

### 2.3 Debloat & Management Component (`/debloat`)
- Packages isolated into `thomson-debloat.txt`:
  - Category 1: Spyware & ACR telemetry (e.g. `com.smartdevice.acr.recommendation`)
  - Category 2: Ad injectors (e.g. `com.smartdevice.recommendation`, `com.google.android.tvrecommendations`)
  - Category 3: Retail demo players (e.g. `fusion.android.tv.demo`, `com.smartdevice.epopplayer`)
- Scripts:
  - `apply-debloat.sh`: Uses `pm disable-user --user 0 <pkg>` with safety backup.
  - `restore-stock.sh`: Uses `pm enable --user 0 <pkg>` and re-enables stock launcher.

## 3. Data Models & Protocols
- **ADB Protocol**: Over TCP port 5555 directly to TV IP `192.168.1.8`.
- **Remote Payload Schema**:
  ```json
  {
    "action": "keyevent",
    "keycode": "KEYCODE_DPAD_CENTER"
  }
  ```
  ```json
  {
    "action": "launch",
    "package": "com.netflix.ninja"
  }
  ```

## 4. Verification & Testing Plan
1. Launcher compilation and install test.
2. Web Remote test via browser subagent / local curl commands.
3. Verification of all remote commands (DPAD, Volume, App launch) responding on the live TV.
