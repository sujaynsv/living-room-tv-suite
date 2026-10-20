# Product Requirements Document (PRD) — Smart TV Suite (v1.1)

## 1. Problem Statement & Background
Smart TVs (specifically Thomson SWTV-20 / Skyworth running Android TV 10) have plain, static, or ad-filled backgrounds. Users desire visual customization, including custom cinematic wallpapers, a dynamic time-of-day sky backdrop that follows the real-world sun cycle, and the ability to upload photos directly from their iPhone / iPad camera roll to display on the TV without needing cloud accounts or complex setup.

## 2. Goals & Objectives
1. **Dynamic Time-of-Day Sky Backdrop**: Real-time atmospheric gradient behind the launcher that follows the clock (dawn warm amber, daytime clarity, sunset glow, midnight deep dark).
2. **Curated Wallpaper Gallery**: Built-in cinematic dark wallpapers optimized for 1080p/4K TVs under 300KB to ensure fast boot times.
3. **iPhone/iPad Photo Upload**: A direct photo upload button inside the Web Remote to pick any image from an iPhone/iPad camera roll, optimize it, and push it live to the TV wallpaper in seconds.
4. **Fast & Responsive Launcher**: Zero lag or micro-stutters with `reduced_motion` enabled for the Mali GPU.

## 3. User Personas & Use Cases
- **Aesthetic Home Screen**: The TV displays a dynamic, living backdrop that complements the room lighting throughout the day.
- **Personalized Wallpaper**: The user takes a picture with their iPhone or selects a favorite wallpaper, taps "Set TV Wallpaper" in the web remote, and the TV updates instantly.
- **Quick Switching**: Pre-installed aesthetic presets (Aurora, Midnight Studio, Mountain Sunrise) switchable in 1 click.

## 4. Key Functional Requirements

### 4.1 Time-of-Day Sky Backdrop (`sky_intensity`)
- Configure `sky_intensity: 60` in the launcher configuration and theme overlays.
- Gradual color transitions matching local system time:
  - Morning (06:00 - 10:00): Warm amber horizon glow.
  - Afternoon (10:00 - 17:00): Deep rich contrast.
  - Evening/Sunset (17:00 - 20:00): Sunset twilight glow.
  - Night (20:00 - 06:00): Dark OLED-friendly starry gradient.

### 4.2 iPhone/iPad Web Remote Upload Interface
- **Photo Picker Button**: A camera/gallery button on the web remote header.
- **Client-Side Compression**: Resizes photos on the phone to 1920×1080 JPEG (~150-250KB) before uploading to ensure instant transfer over Wi-Fi.
- **Preset Wallpaper Carousel**: Quick selector on the web remote with curated presets (Aurora, Cyberpunk, Minimalist Horizon, Midnight Sky).

### 4.3 Backend Wallpaper & Theme Engine (`server.py`)
- `POST /api/wallpaper`: Receives JPEG image data from the web remote.
- Pushes file to `/sdcard/Android/data/com.gathin.tvhome/files/wallpaper.jpg` via ADB.
- Updates `/sdcard/Android/data/com.gathin.tvhome/files/config.json` with `{"wallpaper": true, "sky_intensity": 60}`.
- Restarts launcher smoothly (`am force-stop` followed by `am start`).
- `POST /api/theme/preset`: Applies preset themes instantly.
- `POST /api/wallpaper/reset`: Reverts back to clean pitch black or default background.

## 5. Non-Functional Requirements
- **Memory Footprint**: Wallpapers strictly kept <300KB to prevent OutOfMemory errors on 1GB RAM Android TVs.
- **Latency**: Upload-to-screen time < 2 seconds over local Wi-Fi.
- **Format**: 16:9 aspect ratio center-cropped JPEG.
