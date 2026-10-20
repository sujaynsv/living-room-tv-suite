# Product Requirements Document (PRD) — Smart TV Suite (v3.0)
## Feature Suite: Skyworth 4K TV Stick (Bedroom TV) Performance Optimization & Debloat

## 1. Problem Statement & Motivation
The user has connected a second TV device located in another room:
- **Device Model**: Skyworth Digital TV Stick (`HP47DX2`), running **Android 14** (API 34).
- **IP Address & Port**: `192.168.0.11:5555`.
- **Hardware Constraints**: **Only 960 MB Total RAM (1GB RAM device)**, with only **~46 MB Free RAM**!
- **Current Symptom**: The device is sluggish and unresponsive. Stock Google TV launcher alone is consuming **185 MB RAM** (~20% of the entire stick's memory), while multiple telemetry daemons, OEM background testers, calendar sync, ad tracking services, and unneeded daemons are running continuously. This causes extreme RAM contention, background task killing, and lag when running streaming apps.

## 2. Goals & Success Metrics
- **Preserve All OTT Streaming Services**: Ensure 100% functionality and zero interference with:
  - **Netflix** (`com.netflix.ninja`)
  - **YouTube** (`com.google.android.youtube.tv`)
  - **Hotstar / Disney+ Hotstar** (`in.startv.hotstar`)
  - **Amazon Prime Video** (`com.amazon.amazonvideo.livingroom`)
  - **Apple TV** (`com.apple.atve.androidtv.appletv`)
  - **Aha** (`ahaflix.tv`)
  - **Airtel Xstream** (`tv.airtel.xstream.tvapp`)
  - **Spotify** (`com.spotify.tv.android`)
  - **Formula 1 TV** (`com.formulaone.production`)
  - **YouTube Music** (`com.google.android.youtube.tvmusic`)
  - **Zee5 / DID** (`com.graymatrix.did`)
  - **TCL Browser** (`com.tcl.browser`)
- **Recover Free RAM**: Reclaim 250MB+ of active RAM by disabling background bloatware, OEM QA test apps, and ad tracking services.
- **Ultra-Responsive UI**: Reduce window, transition, and animator scales from 1.0 to 0.5 for immediate, instantaneous D-pad navigation.
- **Safe & Fully Reversible**: All modifications will use `pm disable-user --user 0` rather than destructive removal, backed by an automated one-click restore script (`restore-bedroom-tv.sh`).
- **Clean TV Home Launcher (Optional / Recommended)**: Provide the option to install the lightweight Clean TV Home launcher (15-20 MB RAM vs 185 MB RAM on stock launcher).

## 3. Non-Goals
- Modifying system framework binaries or attempting root operations.
- Removing or disabling Google Play Store or core Google Play Services required for DRM/Widevine L1 video playback.
- Disabling Bluetooth, Wi-Fi, audio/video drivers, or remote pairing daemons (`com.mft.rcupair`).

## 4. Debloat & Optimization Breakdown

### 4.1 Telemetry, Ad Engines & OEM Factory Junk
- `com.skyworth.smallclient` (Skyworth ad & telemetry client)
- `com.skyworth.superservice` (Skyworth cloud telemetry sync)
- `com.sdt.producttest` (Skyworth factory hardware tester)
- `com.oem.qa` (OEM QA test harness)
- `com.oemservice` (OEM background telemetry)
- `com.sdt.customization` (Skyworth customization daemon)
- `com.sdt.projector.observer` (Projector daemon running unnecessarily on a TV Stick)
- `com.sdt.vendor` (Vendor tracking daemon)
- `com.homwee.howtocast` (Third-party advertising & cast guide app)
- `com.mtf.ipcountry` (IP geolocation tracker)
- `com.google.android.feedback` (Google crash/bug reporter)
- `com.android.tv.feedbackconsent` (TV feedback consent uploader)

### 4.2 Heavy Unneeded Services on 1GB RAM
- `com.google.android.play.games` (Google Play Games)
- `com.google.android.syncadapters.calendar` (Calendar sync daemon — 78 MB RAM)
- `com.android.providers.calendar` (Calendar provider — 49 MB RAM)
- `com.android.printspooler` (Print spooler daemon on a TV)
- `com.android.healthconnect.controller` & `backuprestore` (Health Connect on TV)
- `com.android.devicelockcontroller` (Device lock background daemon)
- `com.android.adservices.api` (Android 14 Privacy Sandbox ad daemon)
- `com.android.ondevicepersonalization.services` (On-device ad personalization)
- `com.android.federatedcompute.services` (Federated ad/analytics learning)
- `com.google.android.tvrecommendations` (Launcher sponsored ad rows — 63 MB RAM)
- `com.google.android.tungsten.setupwraith` (Setup wizard lingering in RAM — 55 MB RAM)

### 4.3 Performance & Responsiveness Tuning
- Window animation scale: `0.5`
- Transition animation scale: `0.5`
- Animator duration scale: `0.5`
- Flush background log buffers.
