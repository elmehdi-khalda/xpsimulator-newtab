# xpsimulator new tab

> A Chrome extension that transforms your new tab into an authentic, interactive Windows XP desktop experience with custom app injection and iframe unblocking capabilities.

---

## 🌟 Overview

**xpsimulator new tab** replaces your browser's default blank new tab page with a rich, interactive Windows XP simulation loaded directly in your browser. It includes:
- Authentic Windows XP Start Menu, Taskbar, Window Management, File System, and Desktop Icons.
- **Declarative Net Request Engine**: Unframes protected web applications (YouTube, Google, external tools) so they can run embedded inside Internet Explorer and native desktop windows without X-Frame-Options or CSP blocking.
- **Custom App Injection**: Allows custom web applications, HTML scripts, and external tools to be dynamically injected into the simulation desktop, Start menu, and system registry.

---

## 🚀 Key Features

1. **New Tab Override**: Opens `xpsimulator.com` directly in your new tab seamlessly.
2. **iframe Unblocking Engine**: Modifies response headers (`X-Frame-Options`, `Content-Security-Policy`, `frame-ancestors`) via declarative Chrome MV3 rules, allowing arbitrary web services to display safely inside simulated windows.
3. **Desktop Application Injection**:
   - Web Embedded Apps (running external websites in isolated XP window frames).
   - Raw HTML Apps (running custom standalone HTML/JS code).
   - Link Shortcuts (direct launches with custom XP icons).
4. **Clean & Privacy-Focused**: No external trackers, telemetry, or third-party bloat.

---

## 🛠️ App Injection Architecture

The extension injects applications into the XP simulator runtime via the extension communication layer or postMessage bridge:

### Example: Registering a Web Embedded App

```javascript
// Register a custom web app into the Windows XP Simulator
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

### Example: Registering an HTML App

```javascript
// Register an inline HTML application
window.postMessage({
  type: 'XP_REGISTER_HTML_APP',
  payload: {
    id: 'calculator-tool',
    title: 'Custom HTML App',
    icon: '/images/xp/icons/Calculator.png',
    html: `
      <!DOCTYPE html>
      <html>
        <head><style>body { font-family: Tahoma; padding: 10px; }</style></head>
        <body>
          <h3>Hello from Injected App!</h3>
          <button onclick="alert('Working!')">Click Me</button>
        </body>
      </html>
    `,
    window: { width: 400, height: 300 }
  }
}, '*');
```

---

## 📦 How to Install (Developer Mode)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the extension folder (`add-ons/chrome-no-games`).
5. Open a new tab in Chrome to enjoy your Windows XP simulator!
