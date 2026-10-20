# Product Requirements Document (PRD) — Smart TV Suite (v3.1)
## Feature Suite: Skyworth 4K TV Stick (Bedroom TV) Full UI & Maximum Performance Optimization

## 1. Problem Statement & Motivation
The user has a secondary TV device in the bedroom:
- **Device Model**: Skyworth Digital TV Stick (`HP47DX2`), running **Android 14** (API 34).
- **IP Address & Port**: `192.168.0.11:5555`.
- **Hardware Constraints**: **Only 960 MB Total RAM (1GB RAM device)**.
- **Current State**:
  - While initial debloating disabled 24 OEM/vendor telemetry and test services, the **stock Google TV Home Launcher (`com.google.android.tvlauncher`)** remains the single biggest resource bottleneck, consuming **230 MB of RAM** alone.
  - The **Google TV Recommendations engine (`com.google.android.tvrecommendations`)** consumes an additional **66 MB of RAM** running continuous background scrapers for ad/video previews.
  - Together, the stock launcher eats **~300 MB (~31%)** of the stick's entire physical memory, causing severe video frame drops, slow app launching, and memory pressure.

## 2. Goals & Success Metrics
1. **Lightweight Custom Launcher Deployment**:
   - Deploy `com.livingroom.tvlauncher` (from `launcher/app/build/outputs/apk/debug/app-debug.apk`) onto the Bedroom TV stick.
   - Memory usage: **~25 MB of RAM** (saving **~200 MB** of active memory compared to the stock Google TV launcher).
   - Provide the same sleek, modern interface:
     - Minimal 4-app primary dock (Netflix, Prime Video, Disney+ Hotstar, YouTube).
     - Apps Folder modal for all remaining apps (Apple TV, Aha, Spotify, F1 TV, YouTube Music, Zee5).
     - Dynamic wallpapers, ambient weather/clock, translucent glassmorphism cards, long-press tile reordering, and family profiles.
2. **Deactivate Heavy Stock Launcher & Ad Carousels**:
   - Safely disable `com.google.android.tvlauncher` and `com.google.android.tvrecommendations` once the custom launcher is verified.
   - Provide a 1-click fallback script (`debloat/restore-bedroom-tv-stock-launcher.sh`) to re-enable the stock launcher instantly whenever desired.
3. **Advanced Low-RAM System & UI Tuning**:
   - Restrict background cached processes to prevent memory exhaustion during 4K/FHD video decoding (`max_cached_processes 4`).
   - Maintain 0.5x UI animation scales for instantaneous remote navigation.
4. **Multi-TV Web Remote Support**:
   - Update `remote/server.py` and `remote/index.html` to support switching between **Living Room TV (`192.168.1.8`)** and **Bedroom TV (`192.168.0.11`)** so the user can control either TV seamlessly from their phone.

## 3. Non-Goals
- Modifying core Widevine DRM / Google Play Services (`com.google.android.gms`) required for OTT playback.
- Disabling Bluetooth remote pairing daemons (`com.mft.rcupair`).
- Hard-removing system packages (all changes remain user-space reversible via `pm enable`).

## 4. OTT Application Whitelist (100% Protected)
- Netflix (`com.netflix.ninja`)
- Amazon Prime Video (`com.amazon.amazonvideo.livingroom`)
- Disney+ Hotstar (`in.startv.hotstar`)
- YouTube (`com.google.android.youtube.tv`)
- Apple TV (`com.apple.atve.androidtv.appletv`)
- Aha (`ahaflix.tv`)
- Spotify (`com.spotify.tv.android`)
- Formula 1 TV (`com.formulaone.production`)
- YouTube Music (`com.google.android.youtube.tvmusic`)
- Zee5 / DID (`com.graymatrix.did`)
