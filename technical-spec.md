# Technical Specification — Smart TV Suite (v2.1)
## Architecture, Data Models, APIs & Implementation Plan

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                         THOMSON ANDROID TV LAUNCHER                               |
|  - Minimal 4-App Dock: Netflix, YouTube, Hotstar, Prime Video + "Apps" Folder     |
|  - "Apps" Folder Dialog: Frosted glass modal displaying remaining installed apps  |
|  - Compact Glass Tiles: 146dp x 82dp with 0x18FFFFFF fill & subtle rim (no black) |
|  - DockDecoration: Removed opaque 0xFF141416 black band; seamless glass backdrop  |
|  - Reorder Engine: Long-press enters move mode, DPAD_LEFT/RIGHT swaps dock tiles  |
|  - On-TV Search Helper: Handles Voice + YouTube Search + Input fallback           |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | Wi-Fi / ADB Bridge
                                         v
+-----------------------------------------------------------------------------------+
|                        REMOTE SERVER DAEMON (server.py)                           |
|  - POST /api/wallpapers/upload: Accepts multi-photo batches, stores unique IDs    |
|  - POST /api/ai/ask: Gemini 1.5 Flash (Free Tier) + Zero-Credit Contextual Engine |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | HTTP / JSON (Port 8080)
+-----------------------------------------------------------------------------------+
|                            IPHONE / IPAD WEB REMOTE                               |
|  - Header & Bottom Bar: Prominent Glowing "✨ AI Assistant" (btnOpenAi) Button    |
|  - Multi-Photo Picker (<input type="file" multiple>): Uploads batch to TV         |
|  - Web Speech API: Uses phone's microphone to accurately transcribe voice queries |
|  - Beam to TV: 1-click execution of deep links directly onto TV                   |
+-----------------------------------------------------------------------------------+
```

## 2. Component Implementation Details

### 2.1 Main 4 Apps + "Apps" Folder Architecture
- **Dock Size**: Set `COLUMNS = 5` in `MainActivity.java` and `config.xml`:
  - Slot 0: `com.netflix.ninja` (Netflix)
  - Slot 1: `com.google.android.youtube.tv` (YouTube)
  - Slot 2: `in.startv.hotstar` (Hotstar)
  - Slot 3: `com.amazon.amazonvideo.livingroom` (Prime Video)
  - Slot 4: `Apps` Folder entry (`Entry.FOLDER`)
- **Folder Drawer Dialog** (`dialog_all_apps.xml`):
  - Centered glass dialog containing a `RecyclerView` grid for all other installed applications.
  - Clicking an app inside the folder launches the app and dismisses the folder.
  - Back button (`KEYCODE_BACK`) closes the folder dialog and returns focus to the "Apps" tile.

### 2.2 Long-Press Tile Reordering
- In `AppAdapter.java`:
  - On long click: set `reorderMode = true` and `reorderPosition = position`.
  - In `onTileVerticalKey` or key listener:
    - If in reorder mode, `KEYCODE_DPAD_LEFT` swaps item at `pos` with `pos - 1`.
    - `KEYCODE_DPAD_RIGHT` swaps item at `pos` with `pos + 1`.
    - `KEYCODE_DPAD_CENTER` / `KEYCODE_ENTER` commits the order to `SharedPreferences` (`"dock_order"`) and exits reorder mode.
  - During reorder mode, the active tile plays a subtle pulse animation or has an accent border with a bottom toast/hint: `"Press ◄ / ► to move • OK to save"`.

### 2.3 Eliminating Black Backgrounds & Borders
- **`DockDecoration.java`**:
  - Remove `band.setColor(0xFF141416)`.
  - Replace with soft translucent glow or remove `c.drawRoundRect(rect, radius, radius, band)` so no black band is drawn behind the dock.
- **`tile_bg.xml`**:
  - Replace `<solid android:color="#FF1C1C1E" />` with `<solid android:color="#1AFFFFFF" />` and `<stroke android:width="1dp" android:color="#20FFFFFF" />`.
  - App cards now seamlessly match the glassmorphic style of the top bar buttons.
- **Tile Dimensions**:
  - `DESIGN_W_DP`: change from `180f` to `146f`.
  - `DESIGN_H_DP`: change from `101f` to `82f`.

### 2.4 Web Remote: Missing AI Assistant Button & Multi-Photo Upload
- **`remote/static/index.html`**:
  - Add `<button class="icon-btn ai-btn" id="btnOpenAi" title="AI Voice Assistant">✨</button>` to `.header-actions` right before Power.
  - Add a dedicated AI voice button in the bottom floating toolbar.
- **`remote/static/app.js`**:
  - Change `<input type="file" id="photoInput" accept="image/*">` to include `multiple`.
  - On file selection, iterate over all selected files, resize each to 1080p, and `POST` to `/api/wallpapers/upload`.
  - Send toast: `"Uploaded X photos to TV Slideshow!"`.

### 2.5 TV Voice Assistant & Search Fallback
- On Thomson Android TV 10, voice input over ADB/Katniss times out if the physical remote has no Bluetooth microphone paired.
- When `btnAssistant` is pressed:
  - If Katniss voice fails, provide a quick on-TV search chooser:
    1. **Voice Search (Katniss)**
    2. **Search YouTube (Opens YouTube Search with on-screen keyboard)**
    3. **Search Play Movies / Google TV**
  - This guarantees the user can always find their desired movie/show immediately.

### 2.6 LLM Architecture & Credit Model
- **Gemini API**: Generous free tier (up to 15 Requests Per Minute for `gemini-1.5-flash`), zero payment/billing needed.
- **Built-in Contextual Matcher**: Runs 100% locally and free on Python daemon when no API key is supplied, translating family requests into exact TV search intents.

## 3. Implementation Steps
1. Update `tile_bg.xml` and `DockDecoration.java` to remove black backgrounds and borders.
2. Update `AppAdapter.java` and `MainActivity.java` with 5-item dock (4 main apps + "Apps" folder card).
3. Create `dialog_all_apps.xml` and implement all-apps folder popup.
4. Implement long-press D-pad reordering logic and SharedPreferences persistence.
5. Add `btnOpenAi` to `remote/static/index.html` and style with pulsing gradient.
6. Enable multi-photo upload to `/api/wallpapers/upload` in `remote/static/app.js`.
7. Compile and install APK via ADB, restart remote server daemon, and verify live on TV.
