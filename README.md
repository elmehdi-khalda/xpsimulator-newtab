# Windows XP Simulator - New Tab Companion Extension (Chromium MV3)

[![Website](https://img.shields.io/badge/Website-xpsimulator.com-0055EA?style=for-the-badge&logoColor=white)](https://xpsimulator.com)
[![Docs](https://img.shields.io/badge/Docs-docs.xpsimulator.com-38BDF8?style=for-the-badge&logoColor=white)](https://docs.xpsimulator.com)
[![Manifest](https://img.shields.io/badge/Manifest-MV3-10B981?style=for-the-badge&logoColor=white)](manifest.json)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

The official Chromium companion extension for **[Windows XP Simulator](https://xpsimulator.com)**. It transforms browser new tabs into a fully interactive Windows XP desktop environment and provides net-request rule filtering to unblock live browsing inside Internet Explorer 6.

Repository: **[elmehdi-khalda/xpsimulator-newtab](https://github.com/elmehdi-khalda/xpsimulator-newtab)**

---

## Visual Showcase

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/bliss-and-icons.png" alt="Windows XP Desktop Simulation" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

<br/>

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/ie6-google-web.png" alt="Internet Explorer 6 Live Browsing" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

<br/>

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/app-installer-suite.png" alt="Custom Application Installer" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

<br/>

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/customization-control-panel.png" alt="Customization and Control Panel" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

<br/>

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/ie6-multitab-browsing.png" alt="Multi-Tab Browsing" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

<br/>

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/wmp-canvas-skin.png" alt="Media Player Skin" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

<br/>

<div align="center">
  <img src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/showcase/meem-pack-1.png" alt="Meme Pack Desktop Integration" width="850" style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</div>

---

## Interactive Application Demo: Stickman

Experience autonomous desktop applications built on the Windows XP Simulator SDK.

<div align="center">
  <video src="https://r2-cors-proxy.elmehdikhalda.workers.dev/elmehdikhalda/videos/stickman.mp4" width="850" controls autoplay loop muted style="border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);"></video>
</div>

<br/>

<div align="center">
  <a href="https://docs.xpsimulator.com/#app-examples">
    <img src="https://img.shields.io/badge/Explore%20More%20App%20Videos-docs.xpsimulator.com-0055EA?style=for-the-badge&logoColor=white" alt="More App Videos" />
  </a>
</div>

---

## Core Features and Architecture

### 1. New Tab Replacement
Every new tab session initialises the desktop environment with persistent local state:
- Pixel-aligned Bliss wallpaper, Luna taskbar, system tray, and start menu hierarchy.
- Virtual file system backed by IndexedDB storage with drag-and-drop operations.
- Offline resilience with automatic fallback mechanisms.

### 2. Declarative Net Request Header Unblocking
Modern web applications enforce restrictions that limit iframe embedding (`X-Frame-Options` and `Content-Security-Policy: frame-ancestors`). This extension leverages Chrome Manifest V3 declarative rules (`rules/rules.json`) to strip restriction headers exclusively for simulator sessions:
- Strips `x-frame-options`, `content-security-policy`, `frame-ancestors`, and `cross-origin-embedder-policy`.
- Scope is strictly constrained to traffic initiated by the simulator frame origin (`https://xpsimulator.com` and local development hosts).

### 3. Desktop Display and Brightness Control
The extension options panel includes real-time display controls:
- Hardware-accelerated CSS filter adjustments for screen brightness from 20% to 150%.
- Dynamic contrast and saturation calibration for vintage CRT simulation.
- Preserves display preferences across browsing sessions via browser storage.

### 4. Context Menu Integration: Open Link with Internet Explorer
The extension injects a context menu action accessible across all web pages:
- Right-click any URL or link and select **Open with Internet Explorer**.
- Opens a new tab directly into the simulator with Internet Explorer 6 navigating to the selected URL.

### 5. One-Click Configuration Profiles
Preconfigured profiles allow switching operational modes instantly:
- **Default Profile**: Standard authentic Luna visual layout and preinstalled suite.
- **Minimalist Profile**: Lightweight productivity view without background media layers.
- **Developer Profile**: Enables console bridge debug output and SDK inspect tools.

### 6. Meme Pack Desktop Customisation
The extension includes optional meme assets that introduce classic internet humor directly into the desktop:
- Custom Luna themes, meme desktop wallpapers, sound schemes, and custom desktop widget shortcuts.
- Toggled on demand via the extension popup options without altering virtual hard drive data.

---

## Installation

### From Source (Developer Mode)
1. Clone the repository:
   ```bash
   git clone https://github.com/elmehdi-khalda/xpsimulator-newtab.git
   ```
2. Navigate to `chrome://extensions` in Chromium (Chrome, Brave, Edge).
3. Enable **Developer mode** in the upper right corner.
4. Click **Load unpacked** and select the extension directory.
5. Open a new tab to launch the simulator.

---

## Permissions

| Permission | Purpose |
| :--- | :--- |
| `declarativeNetRequest` | Modifies HTTP response headers to unblock embedding in Internet Explorer 6 |
| `declarativeNetRequestFeedback` | Diagnostics for rule matching in development environments |
| `contextMenus` | Registers the "Open with Internet Explorer" context menu entry |
| `storage` | Persists user settings, brightness levels, and customisation toggles |

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.