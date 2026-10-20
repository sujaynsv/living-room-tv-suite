# Technical Specification — Smart TV Suite (v3.0)
## Bedroom Skyworth TV Stick (192.168.0.11:5555) Debloat & Performance Optimization

## 1. Device Context & Hardware Profile

| Property | Value |
|---|---|
| **Manufacturer / Brand** | SkyworthDigital / Skyworth |
| **Model** | TV Stick (`HP47DX2`) |
| **Android Version** | Android 14 (API 34) |
| **IP Address & Port** | `192.168.0.11:5555` |
| **Total RAM** | 983,496 kB (~1 GB) |
| **Active Available RAM** | ~280 MB (only ~46 MB free!) |
| **Primary Bottleneck** | Heavy background services (Calendar sync, OEM QA, Telemetry, SetupWizard, Recommendations) consuming >50% of available memory on 1GB hardware. |

## 2. Safety & Whitelist Guarantee

### 2.1 Protected OTT Streaming Apps (Never Touched)
```text
com.netflix.ninja                     # Netflix
com.google.android.youtube.tv         # YouTube
in.startv.hotstar                     # Disney+ Hotstar
com.amazon.amazonvideo.livingroom     # Amazon Prime Video
com.apple.atve.androidtv.appletv      # Apple TV
ahaflix.tv                            # Aha
tv.airtel.xstream.tvapp               # Airtel Xstream
com.spotify.tv.android                # Spotify
com.formulaone.production             # Formula 1 TV
com.google.android.youtube.tvmusic    # YouTube Music
com.graymatrix.did                    # Zee5 / DID
com.tcl.browser                       # Web Browser
```

### 2.2 Critical System & Hardware Daemons (Never Touched)
```text
com.mft.rcupair                       # Remote Control Bluetooth Pairing
com.droidlogic                        # Amlogic Hardware Abstraction Layer
com.droidlogic.tv.settings            # Display & TV Hardware Settings
com.android.bluetooth                 # Bluetooth Controller
com.android.systemui                  # System Status Bar & UI
com.google.android.gms                # Google Play Services (DRM / Widevine L1)
com.android.vending                   # Google Play Store
com.google.android.webview            # System Webview
com.dolby.android.audio.service       # Dolby Atmos / Audio Engine
```

## 3. Targeted Debloat List

The following packages will be safely disabled using `pm disable-user --user 0 <package>`:

```text
# ---- SKYWORTH / OEM FACTORY & TELEMETRY ----
com.skyworth.smallclient              # Skyworth ad & telemetry client
com.skyworth.superservice             # Skyworth cloud telemetry sync
com.sdt.producttest                   # Skyworth factory testing app
com.oem.qa                            # OEM QA test tool
com.oemservice                        # OEM background telemetry daemon
com.sdt.customization                 # Skyworth customization daemon
com.sdt.projector.observer            # Projector daemon (unneeded on TV stick)
com.sdt.vendor                        # Vendor tracking service
com.homwee.howtocast                  # Third-party adware / cast guide
com.mtf.ipcountry                     # IP geolocation tracker
com.google.android.feedback           # Google bug/crash feedback reporter
com.android.tv.feedbackconsent        # TV feedback consent uploader

# ---- HEAVY UNNEEDED BACKGROUND SERVICES (1GB RAM OPTIMIZATION) ----
com.google.android.play.games         # Play Games background service
com.google.android.syncadapters.calendar # Calendar sync (eats 78 MB RAM)
com.android.providers.calendar        # Calendar provider (eats 49 MB RAM)
com.android.printspooler              # Print spooler daemon
com.android.healthconnect.controller  # Health Connect
com.android.health.connect.backuprestore # Health Connect backup
com.android.devicelockcontroller      # Device lock background daemon
com.android.adservices.api            # Android 14 Privacy Sandbox ad daemon
com.android.ondevicepersonalization.services # On-device ad personalization
com.android.federatedcompute.services # Federated analytics daemon
com.google.android.tvrecommendations  # Launcher ad recommendation row generator (63 MB RAM)
com.google.android.tungsten.setupwraith # Initial setup wizard lingering in RAM (55 MB RAM)
```

## 4. System Performance & Snappiness Commands

1. **Animation Speedup**:
   - `settings put global window_animation_scale 0.5`
   - `settings put global transition_animation_scale 0.5`
   - `settings put global animator_duration_scale 0.5`
2. **Buffer Flush**:
   - `logcat -b all -c`

## 5. Automation Scripts & Reversibility

### 5.1 Apply Script (`debloat/apply-bedroom-tv.sh`)
Iterates over the list, running:
`adb -s 192.168.0.11:5555 shell pm disable-user --user 0 <package>`
Verifies each package is disabled, clears caches, and applies animation scale settings.

### 5.2 Restore Script (`debloat/restore-bedroom-tv.sh`)
Iterates over the list, running:
`adb -s 192.168.0.11:5555 shell pm enable <package>`
Restores animation scales to `1.0`.

## 6. Verification Plan
1. Check `dumpsys meminfo` and `cat /proc/meminfo` before and after to measure recovered RAM.
2. Verify all 12 OTT apps launch and run smoothly without crashes.
3. Test remote D-pad responsiveness and app switching latency.
