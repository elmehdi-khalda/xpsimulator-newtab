# Windows XP Simulator — Companion Browser Extension (Chrome MV3)

[![Website](https://img.shields.io/badge/Website-xpsimulator.com-0055EA?style=for-the-badge&logo=windows-xp&logoColor=white)](https://xpsimulator.com)
[![Docs](https://img.shields.io/badge/Docs-docs.xpsimulator.com-38BDF8?style=for-the-badge&logo=googledocs&logoColor=white)](https://docs.xpsimulator.com)
[![Manifest](https://img.shields.io/badge/Manifest-MV3-10B981?style=for-the-badge&logo=googlechrome&logoColor=white)](manifest.json)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

> The official Chromium companion extension for **[Windows XP Simulator](https://xpsimulator.com)**. It transforms every new tab into an authentic, fully interactive Windows XP desktop experience and injects an unblocking engine for web browsing inside Internet Explorer 6.

---

## 🌟 Visual Showcase

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/bliss-and-icons.png" alt="Windows XP Desktop Simulation" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

<br/>

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/ie6-google-web.png" alt="Internet Explorer 6 Live Browsing" width="415" style="border-radius: 6px;" />
  &nbsp;
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/app-installer-suite.png" alt="XP Custom Application Installer" width="415" style="border-radius: 6px;" />
</div>

---

## 🚀 Key Features

### 1. 🪟 New Tab Replacement
Every time you open a new tab in Google Chrome, Brave, Edge, or Gravity, the extension instantly serves the authentic Windows XP environment:
- Iconic **Bliss wallpaper** with pixel-accurate Luna Blue taskbar and Start Menu.
- Full desktop drag-and-drop file system backed by persistent IndexedDB storage.
- Real vintage utilities: Notepad, Paint, WordPad, Calculator, Sound Recorder, Command Prompt, and Windows Media Player 9.
- Graceful offline fallback screen with one-click reconnect to localhost or production.

### 2. 🛡️ Declarative Net Request Unblocking Engine (MV3)
Modern websites enforce `X-Frame-Options: SAMEORIGIN` and strict `Content-Security-Policy: frame-ancestors` headers that block iframe embedding. 

This companion extension uses Chrome Manifest V3 declarative rules (`rules/rules.json`) and dynamic request stripping to safely remove restrictive headers exclusively for the simulator frame origin:
- Enables full live web browsing inside the simulated **Internet Explorer 6**.
- Supports search engines, modern documentation sites, YouTube, Wikipedia, and external web tools.
- Strips frame-busting scripts dynamically via content script injection.

### 3. 🧩 Dynamic 3rd-Party & AI App Injection
The extension provides a bidirectional bridge (`window.postMessage`) allowing developers and AI agents to register standalone web tools and desktop widgets directly into the XP desktop:

```javascript
// Register a custom tool into the Windows XP Simulator
window.postMessage({
  type: 'XP_REGISTER_APP',
  payload: {
    id: 'my-custom-tool',
    title: 'My Custom Web Tool',
    icon: 'https://example.com/icon.png',
    url: 'https://example.com/app',
    category: 'Internet',
    window: {
      width: 800,
      height: 600,
      resizable: true,
      fullscreen: false
    }
  }
}, '*');
```

### 4. 🎨 Adaptive Dark / Light New Tab Favicon
Includes a modern compact SVG favicon (`icons/chrome.svg`) that dynamically adapts its fill color according to the user's OS color scheme:
- `#71717A` (Neutral Gray) in Light mode.
- `#9CA3AF` (Muted Zinc) in Dark mode.

---

## 📦 Installation Guide (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/elmehdi-khalda/xp-simulator-companion.git
   ```
2. Open your Chromium-based browser (Chrome, Edge, Brave, Gravity).
3. Navigate to `chrome://extensions`.
4. Enable the **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** and select the extension directory.
6. Open a new tab to launch your Windows XP desktop!

---

## 🏗️ Architecture & Project Structure

```
├── manifest.json            # Chrome Extension Manifest V3 configuration
├── background.js           # Background service worker & rule lifecycle
├── content.js              # Injected content script for iframe bridge
├── frame-fix.js            # Frame-ancestors & X-Frame header mitigation
├── google-classic.js       # Authentic vintage Google search UI rewrite
├── newtab/
│   ├── newtab.html         # New Tab entrypoint with adaptive favicon
│   ├── newtab.css          # Styling & offline fallback modal
│   └── newtab.js           # Target URL resolution & iframe loader
├── popup/
│   ├── popup.html          # Toolbar popup settings menu
│   └── popup.js            # Configuration toggles & status checks
├── rules/
│   └── rules.json          # DeclarativeNetRequest header modification rules
└── icons/                  # High-resolution & adaptive SVG/PNG icons
```

---

## 📄 Documentation & Links

- **Main Simulation**: [xpsimulator.com](https://xpsimulator.com)
- **Developer Documentation & SDK**: [docs.xpsimulator.com](https://docs.xpsimulator.com)
- **SDK Reference Specification**: [`XP_APP_SDK.md`](https://xpsimulator.com/XP_APP_SDK.md)

---

## ⚖️ License & Provenance

Distributed under the MIT License. See [LICENSE](LICENSE) for details.  
Windows XP, Internet Explorer, and related wordmarks are registered trademarks of Microsoft Corporation. This project is an independent artistic, non-commercial retrospective commentary.