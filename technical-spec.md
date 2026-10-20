# Technical Specification — Smart TV Suite (v1.1)

## 1. System Architecture

```
smart-tv-suite/
├── product-requirements.md
├── technical-spec.md
├── README.md
├── launcher/                  # Android TV Leanback Launcher (Kotlin/Gradle)
│   ├── app/src/main/res/values/config.xml # Pinned apps, sky_intensity=60
│   └── ...
├── remote/                    # iPhone / iPad Touch Web Remote
│   ├── server.py              # ADB Bridge + Wallpaper Upload & Preset API
│   ├── wallpapers/            # Curated 1080p aesthetic dark wallpapers
│   │   ├── aurora.jpg
│   │   ├── midnight.jpg
│   │   └── cyberpunk.jpg
│   └── static/
│       ├── index.html         # Remote UI + Wallpaper Picker & Preset Modal
│       ├── style.css          # Glassmorphism, animations, touch styling
│       └── app.js             # Canvas image resize, file upload handler
├── debloat/                   # TV profile & safe management scripts
│   ├── thomson-debloat.txt
│   ├── apply-debloat.sh
│   └── restore-stock.sh
└── config.env
```

## 2. API Specifications

### 2.1 Web Remote Endpoints

#### `POST /api/wallpaper`
- **Content-Type**: `image/jpeg` or `application/octet-stream` (or multipart)
- **Processing**:
  - Saved to local `/tmp/tv_wallpaper.jpg`.
  - Pushed to TV:
    `adb push /tmp/tv_wallpaper.jpg /sdcard/Android/data/com.gathin.tvhome/files/wallpaper.jpg`
  - Updates TV config:
    `echo '{"wallpaper": true, "sky_intensity": 60}' > /tmp/config.json`
    `adb push /tmp/config.json /sdcard/Android/data/com.gathin.tvhome/files/config.json`
  - Signals launcher restart:
    `adb shell am force-stop com.gathin.tvhome && adb shell am start -n com.gathin.tvhome/.MainActivity`
- **Response**:
  ```json
  { "success": true, "message": "Wallpaper updated successfully" }
  ```

#### `POST /api/wallpaper/preset`
- **Body**:
  ```json
  { "preset": "aurora" }
  ```
- **Processing**: Pushes selected preset from `remote/wallpapers/<preset>.jpg` to TV.

#### `POST /api/wallpaper/reset`
- **Processing**: Removes `wallpaper.jpg` from the TV, resets `config.json` to default.

### 2.2 Client-Side Image Resizing (`app.js`)
To avoid large file uploads and ensure TV performance:
- An HTML5 `<canvas>` element reads uploaded photo from iOS Camera Roll.
- Crops & scales image to **1920 × 1080** pixels (16:9).
- Encodes as JPEG with 0.85 quality (~180KB).
- Sends optimized Blob directly to `/api/wallpaper`.

### 2.3 Sky Backdrop Configuration (`config.xml` & `config.json`)
- Key: `"sky_intensity": 60`
- Launcher class: `SkyView.java` & `Sky.java`
- Calculates sunrise/sunset angles based on local system time and renders a GPU-accelerated gradient shader behind tiles.

## 3. Verification & Testing
1. Push preset wallpaper (Aurora) and verify on live TV screen.
2. Test file upload endpoint with curl and browser subagent.
3. Validate memory usage on TV using `adb shell dumpsys meminfo com.gathin.tvhome`.
