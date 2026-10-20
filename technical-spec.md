# Technical Specification — Smart TV Suite (v3.1)
## Bedroom Skyworth TV Stick (192.168.0.11:5555) UI Overhaul & Low-RAM Optimization

## 1. Architecture Overview

```
+---------------------------------------------------------------------------------+
|                       BEDROOM TV STICK (Skyworth HP47DX2)                      |
|                                960 MB Total RAM                                 |
+---------------------------------------------------------------------------------+
          |                                                       |
          v                                                       v
[Custom Leanback Launcher]                            [Stock Services Deactivated]
- com.livingroom.tvlauncher                           - com.google.android.tvlauncher (230MB freed)
- Memory: ~25 MB RAM                                  - com.google.android.tvrecommendations (66MB freed)
- 4-App Minimal Dock (Netflix, Prime, Hotstar, YT)   - OEM Telemetry/Testers (already disabled)
- Apps Folder modal (Aha, Apple TV, Spotify, etc.)
- Dynamic Wallpapers & Glassmorphism UI
- Family Profiles & Weather Widget
          |
          +-------------------------------------------------------+
                                  |
                                  v
                    [Low-RAM System Parameters]
                    - max_cached_processes: 4
                    - window/transition/animator scales: 0.5x
                    - logcat buffers: flushed
```

## 2. Component Implementation Details

### 2.1 Launcher Deployment & Home Assignment
1. Install `launcher/app/build/outputs/apk/debug/app-debug.apk` onto target `192.168.0.11:5555` via ADB:
   ```bash
   adb -s 192.168.0.11:5555 install -r launcher/app/build/outputs/apk/debug/app-debug.apk
   ```
2. Verify package installation:
   ```bash
   adb -s 192.168.0.11:5555 shell pm path com.livingroom.tvlauncher
   ```
3. Set `com.livingroom.tvlauncher` as the active home activity:
   ```bash
   adb -s 192.168.0.11:5555 shell cmd package set-home-activity com.livingroom.tvlauncher/.MainActivity
   ```
4. Disable `com.google.android.tvlauncher` and `com.google.android.tvrecommendations`:
   ```bash
   adb -s 192.168.0.11:5555 shell pm disable-user --user 0 com.google.android.tvlauncher
   adb -s 192.168.0.11:5555 shell pm disable-user --user 0 com.google.android.tvrecommendations
   ```

### 2.2 Low-RAM Kernel & Activity Manager Tuning
1. Limit cached background processes to prevent memory thrashing when high-bitrate video streams play:
   ```bash
   adb -s 192.168.0.11:5555 shell "device_config put activity_manager max_cached_processes 4"
   adb -s 192.168.0.11:5555 shell "settings put global activity_manager_constants max_cached_processes=4"
   ```
2. Force low-RAM trim on background caches:
   ```bash
   adb -s 192.168.0.11:5555 shell am trim-memory com.google.android.gms COMPLETE
   ```

### 2.3 Rollback / Reversibility Tooling
Create `debloat/restore-bedroom-tv-stock-launcher.sh`:
```bash
#!/usr/bin/env bash
TARGET="192.168.0.11:5555"
adb -s $TARGET shell pm enable com.google.android.tvlauncher
adb -s $TARGET shell pm enable com.google.android.tvrecommendations
adb -s $TARGET shell cmd package set-home-activity com.google.android.tvlauncher/.MainActivity
echo "Stock Google TV Launcher restored on $TARGET"
```

### 2.4 Multi-TV Remote Server Enhancements (`remote/server.py` & `remote/index.html`)
1. Add an active device selector in `server.py`:
   - `DEFAULT_DEVICE = '192.168.1.8:5555'` (Living Room TV)
   - Supports query parameter or header `?device=bedroom` or `?target=192.168.0.11:5555`.
2. Add a TV selector pill in the Web Remote UI:
   - `[ Living Room TV ] [ Bedroom TV ]`
   - Tapping switches active target seamlessly, allowing the phone remote to send D-Pad navigation, volume, voice assistant, and wallpaper uploads to either room.

## 3. Verification & Validation Steps
1. **Memory Check**: Verify `MemAvailable` increases above **350 MB** (from the initial 172 MB).
2. **Launch & Navigation Check**: Launch custom launcher and verify smooth 60fps D-pad focus movement.
3. **OTT Integrity Check**: Confirm all 10 OTT apps launch properly from both the 4-app dock and the Apps Folder.
4. **Screencap Capture**: Capture and save `bedroom_custom_launcher_screen.png` to artifacts.
5. **Rollback Script Test**: Ensure `restore-bedroom-tv-stock-launcher.sh` syntax is validated.
