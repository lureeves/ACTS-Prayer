# ACTS Prayer Desktop & Web Application

A desktop prayer application based on the **ACTS** method (**Adoration, Confession, Thanksgiving, Supplication**). Built with **Tauri 2**, **React 18**, **TypeScript**, and **Tailwind CSS**.

Structured to run as a native standalone macOS desktop app bundle (`.app` / `.dmg`) with direct local JSON file system persistence, and deployable as a static web app on **GitHub Pages**.

---

## 🌟 Key Features

1. **The ACTS Guided Experience**:
   - Sequential, distraction-free prayer session flow: **Adoration ➔ Confession ➔ Thanksgiving ➔ Supplication**.
   - Enforces `manualSessionLimit` to cap card counts per category so sessions stay focused.
   - Elegant scripture and prayer card display with celebration upon completion.

2. **Countdown Timer & Preferences**:
   - Non-intrusive floating timer bar during active prayer sessions.
   - Default 15-minute countdown (formatted `MM:SS`) with Start, Pause, Reset, and `+1 min` / `+5 min` quick additions.
   - Non-blocking toast banner and harmonic Web Audio chime when the timer hits `00:00`.
   - Settings modal for configuring default duration, auto-start timer on launch, and local JSON storage path.

3. **Supplication Hierarchy & Threading**:
   - Tree view: **Main Topic** ➔ **Sub-Topic / Individual** ➔ **Cards**.
   - Parses `stackGroup` and `threadId` fields to visualize chronological evolution timelines of how prayer requests develop over time.
   - **Answered Prayer Celebration**: Archiving an active card prompts you to automatically generate a celebratory answered-prayer card in the **Thanksgiving** category.

4. **Algorithmic Scheduling Engine**:
   - **Least-Recently-Prayed**: Uses `lastPrayed` ISO timestamps and `seenCount` to surface items that haven't been prayed for recently.
   - **Day-of-the-Week Routing**: Evaluates `dayOfTheWeekMask` (bitwise flag) to route specific subjects to their assigned days (e.g., Saturday HFG, Tuesday Myself, Wednesday My Guys, Friday Church Prep).
   - **Priority Overrides**: Reads `priorityLevel` to ensure critical requests bypass standard queues and appear at the top.

5. **Content Rendering & Global Quick-Capture**:
   - Markdown parsing (`isMarkdown`) for scriptures, bold text, lists, and links.
   - Global hotkey listener (`Cmd + Shift + P`) to open the floating quick-capture window and log prayer requests instantly.

6. **Dual Persistence Layer**:
   - **Tauri Native macOS Mode**: Overwrites and syncs directly to the local JSON file (`Backup_03-11-26_18-56.json` or custom path) via `@tauri-apps/plugin-fs`.
   - **Web / GitHub Pages Mode**: Seamless fallback to `localStorage` with JSON export and import capabilities.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Rust & Cargo (for native desktop builds)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode

**Web / Browser Mode:**
```bash
npm run dev
# Opens at http://localhost:1420
```

**macOS Desktop Mode (Native Tauri App):**
```bash
npm run tauri dev
```

### 3. Build for Production

**Build Native macOS Application (`.app` and `.dmg`):**
```bash
npm run tauri build
```
The compiled macOS bundle will be located at:
`src-tauri/target/release/bundle/macos/ACTS Prayer.app` and `bundle/dmg/ACTS Prayer_1.0.0_aarch64.dmg`.

**Build Static Web App / PWA (for iPhone & Web):**
```bash
npm run build
```
The static website files will be generated in `dist/`. Deploy to Vercel, Netlify, or GitHub Pages.

---

## 📱 iPhone (PWA) & iCloud Drive Sync

### Accessing on iPhone:
1. Deploy the web build to **Vercel**, **Netlify**, or **GitHub Pages**.
2. Open the URL in **Safari on your iPhone**.
3. Tap the **Share button** (square with up-arrow) ➔ select **Add to Home Screen**.
4. The app opens full-screen like a native iOS app with offline service worker support!

### Syncing with iCloud Drive across Mac & iPhone:
- **On MacBook:** Point the app's active file to your iCloud Drive directory (e.g. `iCloud Drive / ACTS Prayer / Backup_03-11-26_18-56.json`). All prayer sessions, updates, and archives are saved directly to iCloud.
- **On iPhone:** Tap the **iCloud (Cloud icon)** or open **Settings**:
  - **Sync from iCloud Drive:** Pick the latest JSON file from your iOS Files app (iCloud Drive).
  - **Save to iCloud Drive:** Export an updated backup file directly back to iCloud Drive.

---

## 📂 Project Structure

```
Prayer App/
├── Backup_03-11-26_18-56.json     # Primary local JSON database
├── app-icon.svg                   # Vector application icon
├── package.json                   # Frontend dependencies & scripts
├── vite.config.ts                 # Vite config with relative base & Tauri server settings
├── tailwind.config.js             # Tailwind typography & dark mode palette
├── src/
│   ├── types/prayer.ts            # TypeScript interfaces for ACTS data model
│   ├── data/defaultData.ts        # Bundled backup data for web fallback
│   ├── services/
│   │   ├── storage.ts             # Unified Tauri FS & web localStorage persistence
│   │   └── scheduler.ts           # Least-recently-prayed & day-of-week router
│   ├── components/
│   │   ├── TimerBar.tsx           # Floating timer with chime & quick add
│   │   ├── GuidedSessionModal.tsx # Full-screen ACTS prayer flow
│   │   ├── SupplicationTree.tsx   # Hierarchical tree & thread evolution timeline
│   │   ├── CategoryCardsView.tsx  # Adoration, Confession, Thanksgiving views
│   │   ├── QuickCaptureModal.tsx  # Global capture modal (Cmd+Shift+P)
│   │   ├── SettingsModal.tsx      # Preferences, duration & file paths
│   │   ├── MarkdownRenderer.tsx   # Markdown parser for prayer cards
│   │   └── ArchiveToThanksgivingModal.tsx # Answered prayer celebration
│   ├── App.tsx                    # Main app coordinator
│   ├── main.tsx                   # React entry point
│   └── index.css                  # Tailwind styles & macOS window dragging
└── src-tauri/
    ├── Cargo.toml                 # Rust dependencies & Tauri plugins
    ├── tauri.conf.json            # macOS production window & bundle configuration
    ├── build.rs                   # Tauri build script
    ├── icons/                     # Native macOS .icns and PNG app icons
    └── src/
        └── main.rs                # Tauri application entry point & plugin initialization
```
