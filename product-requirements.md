# Product Requirements Document (PRD) — Smart TV Suite (v2.1)
## Feature Suite: Minimal 4-App Dock, "Apps" Folder Drawer, Long-Press Reordering, Glass Tile Redesign & Web/TV Assistant Fixes

## 1. Problem Statement & Motivation
User feedback on the Thomson Android TV launcher and companion web remote highlighted several UX and aesthetic issues:
1. **Home Screen Clutter**: All installed apps currently flood the home screen in multiple rows below the dock. The user prefers a clean, minimal interface with only the 4 main streaming apps (**Netflix, YouTube, Hotstar, Prime Video**) visible, with all remaining apps organized inside an **"Apps" folder**.
2. **Inability to Reorder Apps**: Users cannot rearrange their preferred apps on the home screen using the TV remote.
3. **App Tiles Too Large**: Dock cards (180dp x 101dp) are overly dominant and take up too much vertical and horizontal space.
4. **Harsh Black Backgrounds & Borders**: The dock has an opaque `#141416` black backdrop (`DockDecoration`) and app cards have solid `#1C1C1E` black backgrounds (`tile_bg.xml`), which clash with the translucent glass aesthetic of the top buttons and ambient wallpaper.
5. **Missing AI Button on Web Remote**: The AI Assistant drawer was added in code, but the button (`btnOpenAi`) was never placed into `index.html`, making it impossible for users to open the voice assistant from their phone.
6. **TV Assistant Failing on Voice Input**: Clicking the on-TV Assistant button triggers Katniss / system assist, but because the TV remote is not paired via Bluetooth voice audio, voice prompts fail or time out silently without returning search results.
7. **Wallpaper Upload Overwriting**: The web remote's photo uploader called `/api/wallpaper` (which overwrote a single `wallpaper.jpg`) instead of uploading multiple photos to the `/wallpapers/` directory for the ambient slideshow.
8. **LLM Cost Confusion**: Uncertainty around whether Gemini LLM requires paid API credits or if it can run free.

## 2. Goals & Success Metrics
- **Minimal Home Dock**: Show exactly 4 primary apps (**Netflix, YouTube, Hotstar, Prime Video**) + an **"Apps"** folder card in a single sleek row.
- **Dedicated "Apps" Drawer**: Clicking the "Apps" folder opens a frosted-glass overlay displaying all installed apps with full D-pad navigation.
- **Remote D-Pad Reordering**: Long-pressing any dock tile enters Reorder Mode ("◄ ► to Swap • OK to Save") and persists custom order.
- **Compact Tile Sizing**: Reduce tile size by ~20% (to 146dp x 82dp) for an airy, elegant, premium layout.
- **Glassmorphic Visual Sync**: Eliminate solid black backdrops and dark borders. Replace with translucent glass materials matching the top buttons.
- **Visible Web Remote AI Button**: Dedicated glowing mic button on the mobile web remote header and action drawer.
- **Multi-Photo Wallpaper Upload**: Support selecting and uploading multiple photos at once, adding them to the TV's cycling ambient slideshow.
- **Reliable On-TV Search**: When TV Assistant is clicked, provide quick access to Voice Search, YouTube Search, and text query input so movies/shows are always found even if the physical remote lacks a microphone.
- **Zero-Credit LLM Guarantee**: Explain that Gemini API has a generous free tier (15 requests/min), and maintain the built-in zero-credit contextual fallback.

## 3. Scope & Feature Breakdown

### 3.1 4-App Dock + "Apps" Folder Modal
- The main launcher screen displays exactly 5 items:
  1. **Netflix**
  2. **YouTube**
  3. **Hotstar**
  4. **Prime Video**
  5. **📁 Apps** (Folder card with translucent glass styling)
- Clicking the "Apps" card opens a frosted-glass modal dialog displaying all remaining leanback apps alphabetically.
- All non-dock apps are hidden from the primary home screen to eliminate clutter.

### 3.2 Long-Press Tile Reordering
- Long-pressing any tile in the dock triggers **Reorder Mode**:
  - The selected tile highlights with an animated glow and slight scale.
  - An on-screen hint appears: `"Press ◄ / ► to move • Press OK to finish"`.
  - Pressing `DPAD_LEFT` or `DPAD_RIGHT` swaps the tile with its neighbor in real time.
  - Pressing `DPAD_CENTER` / `OK` saves the new order to `SharedPreferences`.

### 3.3 Compact Tile Size & Glass Styling
- Reduce tile dimensions from `180dp x 101dp` to `146dp x 82dp`.
- Remove `DockDecoration`'s solid black `#141416` band.
- Replace `tile_bg.xml`'s `#1C1C1E` black fill with a frosted glass layer (`0x18FFFFFF` fill, `0x25FFFFFF` 1dp stroke, 16dp rounded corners) that blends into dynamic wallpapers.

### 3.4 Web Remote AI Assistant & Multi-Photo Upload
- Add a prominent `✨ AI Assistant` button in `remote/static/index.html` header and bottom bar.
- Update `remote/static/app.js` to upload photos via `/api/wallpapers/upload` with `<input type="file" multiple>` support.
- Allow users to select multiple photos at once from their iPhone/Android photo library.

### 3.5 TV Assistant / Movie Search Fallback
- When `btnAssistant` is clicked on the TV:
  - If voice recognition is unavailable or fails, show a fast Search Dialog with instant search actions (YouTube movie search, Play Movies search, or on-screen query).
