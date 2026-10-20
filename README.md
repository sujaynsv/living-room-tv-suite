# 📺 Smart TV Suite — Transform Your Android TV

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android%20TV%209%20%7C%2010%20%7C%2011%20%7C%2012-green.svg)](https://android.com)
[![Device Tested](https://img.shields.io/badge/Tested%20On-Thomson%20SWTV--20AE-orange.svg)](https://thomsontv.in)
[![Remote: iOS PWA](https://img.shields.io/badge/Remote-iPhone%20%26%20iPad%20Touch%20Web%20App-purple.svg)](#-part-4--iphone--ipad-touch-web-remote)

A complete, self-contained suite to de-bloat, speed up, and modernize your Android TV. It replaces sluggish, ad-ridden stock home screens with a **minimalist, ad-free Leanback launcher**, disables background spyware (Automatic Content Recognition audio/video trackers and retail ad engines), and provides a **responsive touch remote for your iPhone and iPad** over local Wi-Fi.

Tested and optimized for **Thomson / Skyworth Android TV 10 (SWTV-20AE / SW4H)**, but adaptable to any Android TV device (Xiaomi, TCL, Sony, Motorola, etc.).

---

## 📑 Table of Contents
1. [✨ Features](#-features)
2. [📋 Prerequisites](#-prerequisites)
3. [🔌 Part 1 — Setting Up the TV (Step-by-Step)](#-part-1--setting-up-the-tv-step-by-step)
4. [💻 Part 2 — Connecting Your Computer to the TV](#-part-2--connecting-your-computer-to-the-tv)
5. [🧹 Part 3 — One-Click Debloating & Privacy Cleanup](#-part-3--one-click-debloating--privacy-cleanup)
6. [🚀 Part 4 — Customizing & Installing the Clean Launcher](#-part-4--customizing--installing-the-clean-launcher)
7. [📱 Part 5 — iPhone & iPad Touch Web Remote](#-part-5--iphone--ipad-touch-web-remote)
8. [🔄 Part 6 — How to Restore to Factory Stock (1-Click Undo)](#-part-6--how-to-restore-to-factory-stock-1-click-undo)
9. [🛠️ Troubleshooting & FAQ](#️-troubleshooting--faq)
10. [📂 Repository Structure](#-repository-structure)

---

## ✨ Features

- **Zero Ads, Zero Rows**: Strips sponsored movie recommendations, partner banner carousels, and promotional videos from your TV.
- **Hardware-Tuned Performance**: Configured with `reduced_motion` for smooth, stutter-free 60fps rendering on budget TV processors (MediaTek / Mali GPUs).
- **Curated Dock Apps**: Fast access to your favorite apps pinned in your preferred order:
  - 🍿 Netflix
  - 📺 YouTube
  - 🌟 Disney+ Hotstar
  - 🎬 Prime Video
- **Privacy Hardened**: Disables ACR (Automatic Content Recognition) trackers that fingerprint your screen and audio in the background.
- **Touch Web Remote for iOS**: A touch-first Web App (PWA) with tactile D-Pad, direct app switcher, TV volume/power controls, live screen mirroring, and keyboard text input from your phone.
- **100% Non-Destructive**: Never deletes system partitions or voids warranty. Uses Android's `pm disable-user --user 0` which can be reverted at any time with a single script.

---

## 📋 Prerequisites

On your computer (macOS / Linux / Windows with WSL):

### 1. Android Debug Bridge (`adb`)
- **macOS (Homebrew)**:
  ```bash
  brew install android-platform-tools
  ```
- **Ubuntu / Debian**:
  ```bash
  sudo apt update && sudo apt install -y adb
  ```
- **Windows**:
  Download [Android SDK Platform-Tools for Windows](https://developer.android.com/tools/releases/platform-tools) and add the folder to your `PATH`.

### 2. Java Development Kit (JDK 17)
*(Required only if you wish to recompile the launcher APK)*:
- **macOS**:
  ```bash
  brew install openjdk@17
  ```
- **Ubuntu / Debian**:
  ```bash
  sudo apt install -y openjdk-17-jdk
  ```

### 3. Python 3.8+
Required for the web remote server and ADB helper scripts:
```bash
python3 --version
```

---

## 🔌 Part 1 — Setting Up the TV (Step-by-Step)

Before your computer can communicate with your TV, you must enable **Developer Mode** and **USB/Network Debugging** on Android TV.

### Step 1.1: Connect TV to Wi-Fi & Note the IP Address
1. Turn on your TV and press the **Settings (⚙️)** button on the remote (or open Settings from the top right of the home screen).
2. Select **Network & Internet**.
3. Ensure the TV is connected to your home Wi-Fi network (your computer/iPhone must be on this **exact same Wi-Fi network**).
4. Click on your connected network name.
5. Scroll down to find **IP address** (e.g., `192.168.1.8`). **Write this IP down.**

### Step 1.2: Unlock Developer Mode
1. In the TV's Settings, navigate to **Device Preferences** → **About**.
2. Scroll all the way down to **Android TV OS Build** (or **Build**).
3. Press the **OK / Center button** on your remote **7 times repeatedly**.
4. You will see toast notifications:
   - *"You are now 4 steps away from being a developer."*
   - ...
   - *"You are now a developer!"*

### Step 1.3: Enable Debugging
1. Press **Back** once to return to **Device Preferences**.
2. Scroll down — a new menu item called **Developer options** will now be visible. Click to open it.
3. Turn on the toggle for **Developer options** (if not already on).
4. Under the **Debugging** section:
   - Turn **ON** `USB debugging`.
   - Confirm the popup: *"Allow USB debugging? USB debugging is intended for development purposes only."* → Select **OK**.
   - Ensure **Verify apps over USB** is also enabled.

---

## 💻 Part 2 — Connecting Your Computer to the TV

Now connect your computer to the TV over your local network.

1. Open a terminal on your computer and verify ADB is installed:
   ```bash
   adb version
   ```

2. Connect to the TV using the IP address from Step 1.1:
   ```bash
   adb connect 192.168.1.8:5555
   ```
   *(Replace `192.168.1.8` with your TV's actual IP).*

3. **Look at your TV screen!** A dialog box will appear:
   > **Allow USB debugging?**
   >
   > The computer's RSA key fingerprint is: `XX:XX:XX:...`
   >
   > [x] Always allow from this computer
   >
   > **[ CANCEL ]  [ OK ]**

4. Check the box **"Always allow from this computer"** using your TV remote and click **OK**.

5. Verify the connection in your terminal:
   ```bash
   adb devices
   ```
   Output must show:
   ```
   List of devices attached
   192.168.1.8:5555    device
   ```
   *(If it says `unauthorized`, look at the TV screen again and accept the prompt).*

---

## 🧹 Part 3 — One-Click Debloating & Privacy Cleanup

Stock TVs ship with aggressive tracking and sponsored rows. We safely disable these background services without deleting system binaries.

### What gets disabled:
| Package | Description | Reason |
|---|---|---|
| `com.smartdevice.acr.recommendation` | ACR (Automatic Content Recognition) | Fingerprints video/audio to track viewing habits |
| `com.smartdevice.recommendation` | DailyPlay Ad Engine | Injects sponsored recommendation rows |
| `com.smartdevice.leanbacklauncher.customizer` | Partner row customizer | Injects third-party promotional banners |
| `com.google.android.tvrecommendations` | Google TV recommendations | Sponsored home screen feed |
| `com.facebook.katana` | Pre-installed Facebook stub | Unnecessary background tracking |
| `com.smartdevice.epopplayer` | Retail shop demo player | In-store looping promotional player |
| `fusion.android.tv.demo` | Demo mode player | Retail demo service |
| `com.qjy.browser` | Pre-installed third-party browser | Telemetry and background memory usage |
| `com.google.android.feedback` | Google crash reporter | Continuous background telemetry logs |
| `com.google.android.play.games` | Google Play Games | Unused background gaming services |
| `com.google.android.backdrop` | Heavy ambient screensaver | Consumes memory when idle |

### Run the Debloat Script:
```bash
cd /path/to/smart-tv-suite
./debloat/apply-debloat.sh
```

A complete recovery snapshot is saved before making any changes. The TV immediately frees up RAM and stops sending ACR viewing data.

---

## 🚀 Part 4 — Customizing & Installing the Clean Launcher

The launcher provides an ultra-minimal home screen: a clean clock/date bar, an Inputs switcher, Wi-Fi status, and a fast bottom dock.

### 4.1 Customize Dock Apps & Settings (Optional)
Open `launcher/app/src/main/res/values/config.xml`:

```xml
<!-- Apps pinned to the dock in this exact order -->
<string-array name="dock_apps">
    <item>com.netflix.ninja</item>
    <item>com.google.android.youtube.tv</item>
    <item>in.startv.hotstar</item>
    <item>com.amazon.amazonvideo.livingroom</item>
</string-array>

<!-- Tuned for MediaTek Mali GPU to prevent micro-stutters -->
<bool name="reduced_motion">true</bool>

<!-- Live TV Tuner Shortcut in Inputs menu -->
<string name="live_tv_package">com.smartdevice.livetv</string>
```

### 4.2 Build and Deploy to TV
Run the automated build & install script:
```bash
TV_HOST=192.168.1.8 ./launcher/build-and-install.sh
```

This script automatically:
1. Compiles the optimized release APK using Gradle.
2. Pushes and installs the launcher onto the TV.
3. Tests that the launcher activity boots successfully.
4. Sets the new launcher as the default Android `HOME` screen.
5. Disables the sluggish stock launcher (`com.google.android.tvlauncher`).

**Press the Home button on your TV remote — your clean, fast home screen will appear!**

---

## 📱 Part 5 — iPhone & iPad Touch Web Remote

Turn your iPhone or iPad into a responsive, haptic-enabled TV remote with keyboard text entry and live screen preview.

### 5.1 Start the Local Remote Bridge
Run this on your computer:
```bash
python3 remote/server.py
```
Output:
```
=======================================================
 📺 Smart TV Suite — iPhone / iPad Touch Remote Server
=======================================================
 • Connected to TV:  192.168.1.8:5555
 • Mac Local URL:    http://localhost:8080
 • iPhone/iPad URL:  http://192.168.1.165:8080
 Open the iPhone/iPad URL in Safari and tap 'Add to Home Screen'
=======================================================
```

### 5.2 Add to Home Screen on iOS
1. On your iPhone or iPad, open **Safari** and go to:
   ```
   http://192.168.1.165:8080
   ```
   *(Use the IP shown in your terminal output).*
2. Tap the **Share icon (square with arrow pointing up)** at the bottom of Safari.
3. Scroll down and tap **Add to Home Screen**.
4. Name it **TV Remote** and tap **Add**.

### 5.3 What You Can Do from the Remote
- **D-Pad Wheel**: Tap Up, Down, Left, Right, and Center OK for instant navigation.
- **Direct App Switcher**: 1-tap launch for Netflix, YouTube, Hotstar, Prime Video, JioCinema, and Spotify.
- **Keyboard Input**: Tap the **Type** button to open a text box on your phone. Type any movie title or password and tap **Send to TV** — it types directly into the TV's search bar!
- **Volume & Power**: Control volume up/down, mute, and toggle TV sleep/wake.
- **Live Screen Preview**: Tap the preview icon to see a real-time snapshot of the TV screen directly on your phone.

---

## 🔄 Part 6 — How to Restore to Factory Stock (1-Click Undo)

Everything done by this suite is completely reversible. If you ever want to revert back to the original factory home screen and re-enable all stock apps:

```bash
./debloat/restore-stock.sh
```

This script:
1. Re-enables every package in the debloat profile (`pm enable --user 0`).
2. Re-enables the stock Android TV launcher (`com.google.android.tvlauncher`).
3. Resets Android's default Home activity to the stock launcher.

Your TV is completely returned to its factory state without needing a factory reset.

---

## 🛠️ Troubleshooting & FAQ

### Q: `adb connect` says `Connection refused` or times out
- Verify your TV is turned ON and not in deep sleep.
- Make sure your TV and computer are on the **exact same Wi-Fi SSID** (e.g. not one on 2.4GHz Guest network and one on 5GHz main network).
- Re-check your TV's IP address under **Settings → Network & Internet**.

### Q: `adb devices` shows `unauthorized`
- Look at the TV screen — accept the **Allow USB debugging** prompt and make sure to check *"Always allow from this computer"*.
- If the prompt doesn't appear, run:
  ```bash
  adb kill-server && adb connect 192.168.1.8:5555
  ```

### Q: Can I use this on other TV brands (Sony, Xiaomi, TCL, OnePlus)?
- **Yes!** The launcher and remote work on any Android TV (Android 9, 10, 11, 12+).
- For debloating other brands, check package names first (`adb shell pm list packages`) before disabling vendor-specific apps.

### Q: Does this void my TV warranty or prevent OTA system updates?
- **No.** The scripts only disable packages for user 0 (`pm disable-user --user 0`). System partitions remain completely intact, and official firmware updates will continue to work normally.

---

## 📂 Repository Structure

```
smart-tv-suite/
├── product-requirements.md   # Product Requirements Document (PRD)
├── technical-spec.md         # Technical architecture & API contracts
├── README.md                 # Complete documentation & instructions
├── config.env                # TV IP and port configuration
├── launcher/                 # Leanback Android TV launcher source code
│   ├── app/src/main/res/values/config.xml # Pinned apps, dock, and GPU settings
│   ├── build.gradle          # Gradle project configuration
│   └── build-and-install.sh  # Build & push launcher to TV
├── remote/                   # Touch Web Remote for iOS / Safari
│   ├── server.py             # Python HTTP ADB bridge
│   └── static/
│       ├── index.html        # Modern mobile web remote UI
│       ├── style.css         # Dark glassmorphism, OLED styling
│       └── app.js            # D-pad, gestures, haptic feedback, keyboard input
└── debloat/                  # Bloatware removal and restore tools
    ├── thomson-debloat.txt   # Curated list of 15 telemetry/ad packages
    ├── apply-debloat.sh      # Disables telemetry/ads safely
    ├── restore-stock.sh      # 1-click restore to factory state
    └── tv.py                 # Pure Python ADB client fallback
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
Feel free to fork, customize, and share!
