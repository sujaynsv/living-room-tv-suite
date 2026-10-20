# Product Requirements Document (PRD) — Smart TV Suite (v2.0)
## Feature Suite: UI Optimization, Startup Profile Cloud, Ambient Slideshow, Weather & On-TV / Web AI Assistant

## 1. Problem Statement & Motivation
The Smart TV launcher has made significant strides with profile-based greetings, time-of-day sky gradients, and touch controls. However, user feedback reveals key opportunities:
1. **Date Truncation**: On 1080p displays, the date text is truncated (`...`) due to wide letter spacing and all-caps formatting constrained next to action buttons.
2. **Missing Local Weather Context**: Users want quick real-time weather and temperature without opening a separate app.
3. **Manual Profile Selection**: When the TV turns on, users have to manually remember to switch profiles via the top menu rather than being prompted at startup.
4. **Single Static Wallpaper**: A single wallpaper quickly feels static; a multi-photo slideshow turns the TV into an ambient, living family gallery (like Apple TV / Samsung The Frame).
5. **Direct On-TV Assistant Access**: Users shouldn't be strictly dependent on their phone web remote to invoke search or AI. A dedicated button on the TV UI allows launching voice/assistant directly using the physical TV remote.
6. **Zero-Server Standalone Dependency**: Core TV launcher features (Date, Weather, Profiles, Startup Cloud, Ambient Slideshow, and Native TV Voice Search) must run **100% locally on the TV** with zero reliance on an external server or laptop being powered on.

## 2. Goals & Success Metrics
- **Zero UI Truncation**: Clean, modern date representation (`Tue, Oct 20` or natural format) that never truncates.
- **Stand-Alone Operation**: TV works completely independently even if the Mac/server is offline.
- **Instant Weather Awareness**: Real-time temperature & condition icon on the top bar fetched natively.
- **Frictionless Profile Activation**: On TV wake/startup, a welcoming glassmorphic card ("Hi, who's watching TV?") allows 1-click selection via standard TV remote.
- **On-TV Assistant Button**: A top-bar pill button (`[ ✨ Assistant ]`) on the launcher that launches voice/search directly on the TV.
- **Ambient Multi-Photo Slideshow**: Support for multiple uploaded photos with smooth cross-fade animation stored locally on the TV.
- **AI Voice Discovery (Web Remote)**: Optional companion assistant on iPhone/iPad powered by Gemini/LLM for conversational recommendations and deep linking.

## 3. Server Dependency Matrix
| Feature | Requires Python Server on Mac? | Runs Standalone on Android TV? |
|---|:---:|:---:|
| Date Fix & UI Layout | ❌ No | ✅ 100% Native on TV |
| Startup "Who's watching?" Cloud | ❌ No | ✅ 100% Native on TV |
| TV Remote Profile Switching | ❌ No | ✅ 100% Native on TV |
| Ambient Multi-Photo Slideshow | ❌ No (once photos pushed) | ✅ 100% Native on TV |
| On-TV Assistant Button (Mic/Search) | ❌ No | ✅ 100% Native on TV |
| Real-time Weather Widget | ❌ No (direct fetch from TV) | ✅ 100% Native on TV |
| Phone Web Remote & Gemini Voice Beam | ✅ Yes (when using phone remote) | ❌ Needs Mac daemon |

## 4. Functional Requirements

### 4.1 UI Layout Optimization & Date Truncation Fix
- Fix date container constraints and letter spacing.
- Use natural-casing (`Tuesday, 20 October` or `Tue, Oct 20`) with clean `Outfit Light` typography.
- Allocate balanced width between left clock/weather block and right top action buttons.

### 4.2 Live Weather Widget (Native TV Fetch)
- Lightweight weather indicator displaying current temperature (°C) and condition icon (☀️, ⛅, 🌧️, 🌤️).
- Automatically fetched via HTTP directly from the TV to Open-Meteo API using coarse geolocation (zero API keys).
- Cached locally on the TV for 30 minutes to minimize network traffic and TV CPU usage.

### 4.3 Startup "Who's Watching?" Glass Cloud
- Triggers on TV boot or initial launcher start if no profile was chosen in the current session.
- Glassmorphic card overlay centered on screen:
  - Header: "Hi, who's watching TV?"
  - Large interactive avatar cards:
    - 🟣 Sujay
    - 🔵 Devendra Babu
    - 🌸 Sirisha
  - Remote D-pad navigable with high-contrast glowing focus states.
  - Selecting an avatar sets active profile, records session start, and dismisses smoothly.
  - Option to dismiss via Back key (keeps last active profile).

### 4.4 On-TV Assistant Button (`btnAssistant`)
- Added to the launcher top bar alongside `btnProfile` and `btnSettings`.
- Label / Icon: `✨ Search` or `🎙️ Assistant`.
- Behavior:
  - Invokes Android's native speech recognition / search intent (`android.speech.action.RECOGNIZE_SPEECH` or Android TV Search intent `android.intent.action.ASSIST` / `com.google.android.katniss.SEARCH`).
  - Allows instant hands-free or remote-controlled search across installed apps (YouTube, Netflix, Prime Video, Hotstar).

### 4.5 Multi-Photo Ambient Slideshow
- Web remote supports uploading multiple photos into a dedicated gallery on the TV.
- TV launcher periodically cycles through uploaded wallpapers every 30/60 seconds with smooth alpha cross-fading.
- Auto-pause slideshow when an app is launched to conserve GPU/RAM; resume when returning home.

### 4.6 LLM Integration & Voice Assistant (Web Remote Companion)
- **Web Remote Voice/Text Interface**:
  - Microphone button using Web Speech API (dictate on iPhone/iPad Safari).
  - Text input fallback for quick typing.
- **LLM Processing (Gemini API via server.py)**:
  - Considers active family profile context (Sujay, Devendra Babu, or Sirisha).
  - Generates concise recommendations with 1-tap "Beam to TV".

## 5. Non-Functional Requirements
- **Mali-G31 GPU Safety**: Slideshow transitions must use hardware-accelerated canvas/ImageView alpha animations without memory leaks.
- **Battery & Resource Efficiency**: Standalone TV features use < 25MB RAM and 0% CPU when in background.
