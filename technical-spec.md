# Technical Specification — Smart TV Suite (v2.0)
## Architecture, Data Models, APIs & Implementation Plan

## 1. System Architecture Diagram

```
[ STANDALONE TV (Works without Laptop / Server) ]
+-----------------------------------------------------------------------------------+
|                         THOMSON ANDROID TV LAUNCHER                               |
|  - UI Header: Fixed Date Formatting (no truncation) + Live Weather Pill           |
|  - On-TV Assistant Button (Top bar [✨ Search]): Triggers Android Speech/Assist  |
|  - Startup Cloud Modal: "Hi, who's watching TV?" with D-pad navigable avatar chips|
|  - Ambient Slideshow Engine: Cross-fade ImageViews from local wallpapers/ dir     |
|  - Standalone Weather Client: Native background thread queries Open-Meteo         |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | Optional Wi-Fi connection
                                         v
[ COMPANION SUITE (Optional Laptop/Phone Features) ]
+-----------------------------------------------------------------------------------+
|                        REMOTE SERVER DAEMON (server.py)                           |
|  - Gemini LLM Engine: Uses GEMINI_API_KEY to process intent & format TV intents  |
|  - Multi-Photo Sync: Pushes photos to TV /sdcard/Android/data/.../wallpapers/    |
|  - ADB Bridge: am broadcast, deep links, keyevents                                |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | HTTP / JSON (Port 8080)
+-----------------------------------------------------------------------------------+
|                            IPHONE / IPAD WEB REMOTE                               |
|  - HTML5 Web Speech API (Microphone) -> Speech-to-Text                            |
|  - Multi-Photo Canvas Compressor (1080p WebP/JPEG)                                |
|  - Voice Assistant Drawer (Chat, Gemini suggestions, "Beam to TV" 1-click button) |
+-----------------------------------------------------------------------------------+
```

## 2. Component Details

### 2.1 UI Layout Optimization & Date Truncation
- **File**: `launcher/app/src/main/res/layout/activity_main.xml`
- **Changes**:
  - `date`: Change `singleLine` to allow flexible wrapping or standard compact format (`EEE, d MMM`).
  - Adjust `letterSpacing` from `0.14` to `0.04` to avoid excessive word expansion.
  - Set `textAllCaps="false"` for elegant natural typography (`Tue, 20 Oct`).
  - Right-side `topButtons`: Rebalanced margins and widths to give date/weather container ample breathing room.

### 2.2 Live Weather Widget (Native TV Fetch)
- **API**: Open-Meteo (`https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current_weather=true` or auto IP location).
- **Execution**: Background `ExecutorService` in `MainActivity.java`, results posted to UI handler.
- **Cache**: Cached in `SharedPreferences` for 30 minutes. If offline, gracefully hidden.

### 2.3 On-TV Assistant Button (`btnAssistant`)
- **File**: `activity_main.xml` (inside `topButtons` container)
- **Visual**: Glass pill button:
  - Icon: Sparkle/Mic (`ic_assistant.xml` or text `✨ Search`)
  - Focus state: Standard TV launcher focus glow
- **Click Action**:
  ```java
  try {
      Intent intent = new Intent(Intent.ACTION_ASSIST);
      startActivity(intent);
  } catch (Exception e) {
      try {
          Intent voiceIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
          startActivity(voiceIntent);
      } catch (Exception ex) {
          // Fallback to installed YouTube search
          Intent yt = new Intent(Intent.ACTION_SEARCH);
          yt.setPackage("com.google.android.youtube.tv");
          startActivity(yt);
      }
  }
  ```

### 2.4 Startup "Who's Watching?" Glass Cloud
- **Trigger**: In `MainActivity.onCreate()` / `onResume()`, check `isFirstRunSession` (or if TV was woke from sleep after >30 minutes idle).
- **Layout**: Centered floating cloud card (`dialog_profile_cloud.xml`):
  - Title: `"Hi, who's watching TV?"` (`outfit_light.xml`, 26sp)
  - Profile Row:
    - Chip 1: Sujay (Purple Glow)
    - Chip 2: Devendra Babu (Cyan Glow)
    - Chip 3: Sirisha (Rose Glow)
  - D-pad focus automatically highlights the last active user or first chip.
  - Clicking `KEYCODE_DPAD_CENTER` / `ENTER` sets active profile, animates the cloud away, and begins session tracking.
  - Pressing `BACK` dismisses without changing.

### 2.5 Multi-Photo Ambient Slideshow
- **Storage**: `/sdcard/Android/data/com.gathin.tvhome/files/wallpapers/`
- **Engine**: In `MainActivity.java`:
  - Maintains a list of wallpaper files found in the directory.
  - When length > 1, schedules a `Handler.postDelayed(slideshowRunnable, 45000)`.
  - Uses two overlapping `ImageView` layers: fades out front image (`alpha 1.0 -> 0.0`) while fading in background image (`alpha 0.0 -> 1.0`) over 1.2 seconds using `ViewPropertyAnimator`.
  - Garbage collection friendly: reuses bitmaps or decodes downsampled 1080p bitmaps (`BitmapFactory.Options.inSampleSize`).

### 2.6 LLM Voice Assistant & Deep Link Beamer (Web Companion)
- **Web Remote Microphone**:
  - HTML5 `webkitSpeechRecognition` / `SpeechRecognition` records voice query in browser.
  - Sends text to `POST /api/ai/ask`.
- **Backend API (`server.py`)**:
  - Endpoint: `POST /api/ai/ask`
  - Calls Gemini API with user profile context to generate smart recommendations and TV intent actions.

## 3. Phased Implementation Plan
- **Phase 1**: Fix date truncation, add Weather pill, and add on-TV Assistant button in `activity_main.xml` and `MainActivity.java`.
- **Phase 2**: Implement the startup "Who's watching?" glass cloud modal with D-pad navigation.
- **Phase 3**: Build Multi-Photo ambient slideshow engine in the launcher + multi-file upload in Web Remote.
- **Phase 4**: Add AI Voice Assistant to the Web Remote with Gemini integration and 1-tap "Beam to TV".
- **Phase 5**: Verification on live TV screen, commit to feature branch, merge to `main`, and push.
