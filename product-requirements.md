# Product Requirements Document (PRD) — Smart TV Suite

## 1. Problem Statement & Background
Smart TVs (specifically Thomson SWTV-20 / Skyworth running Android TV 10) suffer from intrusive advertising rows, slow stock launchers, background telemetry (such as Automatic Content Recognition tracking), and cumbersome remote navigation. Users also want a seamless, fast remote control on their iPhone/iPad and a customized, minimal home screen pinned with their favorite streaming services (Netflix, YouTube, JioHotstar, Prime Video).

## 2. Goals & Objectives
1. **Clean TV Launcher**: A fast, distraction-free Android TV launcher configured specifically for this hardware with zero ads and pinned dock apps.
2. **iPhone/iPad Web Remote**: A web-based remote control optimized for iOS mobile Safari that connects to the TV over local Wi-Fi, allowing full D-pad control, volume, media playback, app switching, and keyboard text typing.
3. **Automated Debloat & TV Management**: One-click scripts to safely disable/restore background telemetry, retail shop demos, and ad engines.
4. **Standalone & Organized Codebase**: A clean, single project root that the user can open in their IDE (`Antigravity IDE` / VS Code), with clear modular subprojects.

## 3. User Personas & Use Cases
- **Viewer**: Enjoys instant boot-to-home, lightning-quick navigation without lag or sponsored recommendation banners.
- **Mobile Control**: Controls the TV from iPhone or iPad via a web app without needing third-party cloud accounts or app store installs.
- **Power User / Developer**: Can rebuild the launcher, tweak themes/dock order, or restore factory defaults with simple commands.

## 4. Key Functional Requirements

### 4.1 TV Launcher Subsystem (`/launcher`)
- Pre-configured dock with:
  1. Netflix (`com.netflix.ninja`)
  2. YouTube (`com.google.android.youtube.tv`)
  3. Disney+ Hotstar (`in.startv.hotstar`)
  4. Prime Video (`com.amazon.amazonvideo.livingroom`)
- Hardware acceleration tuned for MediaTek / Android 10 (`reduced_motion=true`).
- Native Live TV tuner shortcut mapped to `com.smartdevice.livetv`.

### 4.2 Web Remote Subsystem (`/remote-server` & `/web-remote`)
- Lightweight Node.js or Python backend running on the local machine on port 3000/8080.
- Serves a sleek, modern touch-first web interface for iPhone / iPad Safari:
  - D-Pad (Up, Down, Left, Right, Center/OK)
  - Navigation (Back, Home, Menu)
  - Volume (Up, Down, Mute)
  - Quick App Switcher tiles (Netflix, YouTube, Hotstar, Prime Video)
  - Text input dialog (typing on iPhone sends text directly into TV input fields via ADB)
- Communicates directly with the TV over ADB TCP (`192.168.1.8:5555`).

### 4.3 TV Management & Debloat Subsystem (`/scripts`)
- `debloat.sh`: Applies the safe debloat profile (disables ACR, ad injection, demo mode).
- `restore.sh`: One-click instant restore of all original stock apps and launcher.
- `install-launcher.sh`: Compiles and installs the latest launcher APK onto the TV.
- `screenshot.sh`: Captures live TV screen to file.

## 5. Non-Functional Requirements
- **Low Latency**: Keypresses from iPhone remote should register on TV in <50ms.
- **Safety**: Never uninstall packages; use `pm disable-user --user 0` with full recovery snapshots.
- **Self-Contained**: Clear folder structure, README, configuration files, and zero unnecessary bloat from other TV vendors.
