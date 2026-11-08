/**
 * Windows XP Simulator - Frame Integration Content Script
 * Synchronizes address bar & title with Internet Explorer simulation.
 * Runs in ISOLATED world.
 */

(function () {
  // Helper to sync extension state to the simulator window
  function initSimulatorBridge() {
    function applyBridgeState(openInIE, enableMemePack = false, keepWindowsOpen = false, singleClickOpen = false) {
      const openInIeStr = String(openInIE);
      const memePackStr = String(enableMemePack === true);
      const keepWindowsStr = String(keepWindowsOpen === true);

      if (document.documentElement) {
        document.documentElement.setAttribute('data-xp-extension', 'true');
        document.documentElement.setAttribute('data-xp-extension-open-in-ie', openInIeStr);
        document.documentElement.setAttribute('data-xp-meme-pack', memePackStr);
        document.documentElement.setAttribute('data-xp-keep-windows', keepWindowsStr);
        document.documentElement.setAttribute('data-xp-single-click', String(singleClickOpen === true));
        document.documentElement.setAttribute('data-xp-games', 'false');
      }

      try {
        localStorage.setItem('xp_extension_installed', 'true');
        localStorage.setItem('xp_extension_enabled', 'true');
        localStorage.setItem('xp_extension_open-in-ie', openInIeStr);
        localStorage.setItem('xp_meme_pack', enableMemePack ? '1' : '0');
        localStorage.setItem('xp_keep_windows_open', keepWindowsOpen ? '1' : '0');
        localStorage.setItem('xp_single_click_open', singleClickOpen ? '1' : '0');
        localStorage.setItem('xp_extension_games', 'false');
      } catch (_) {}

      try {
        window.postMessage({
          type: 'XP_EXTENSION_READY',
          installed: true,
          enabled: true,
          openInIE: openInIE,
          enableMemePack: enableMemePack,
          keepWindowsOpen: keepWindowsOpen,
          singleClickOpen: singleClickOpen,
          games: false
        }, '*');
        window.dispatchEvent(new CustomEvent('xp-extension-status', {
          detail: { installed: true, enabled: true, openInIE: openInIE, enableMemePack: enableMemePack, keepWindowsOpen: keepWindowsOpen, games: false }
        }));
      } catch (_) {}
    }

    // 1. Initial load from storage
    chrome.storage.local.get(['openInIE', 'xpOverlaySettings', 'enableMemePack', 'keepWindowsOpen', 'singleClickOpen', 'brightness'], (data) => {
      const openInIE = data.openInIE !== false;
      const enableMemePack = data.enableMemePack === true;
      const keepWindowsOpen = data.keepWindowsOpen === true;
      const singleClickOpen = data.singleClickOpen === true;
      applyBridgeState(openInIE, enableMemePack, keepWindowsOpen, singleClickOpen);
      if (data.brightness !== undefined) {
        window.postMessage({ type: 'XP_BRIGHTNESS_CHANGED', brightness: data.brightness }, '*');
      }
      const overlaySettings = data.xpOverlaySettings || { masterEnabled: true };
      window.postMessage({
        type: 'XP_OVERLAY_SETTINGS_CHANGED',
        settings: overlaySettings
      }, '*');
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        chrome.storage.local.get(['openInIE', 'xpOverlaySettings', 'themeMode', 'enableMemePack', 'keepWindowsOpen', 'singleClickOpen', 'brightness'], (data) => {
          applyBridgeState(data.openInIE !== false, data.enableMemePack === true, data.keepWindowsOpen === true, data.singleClickOpen === true);
          if (data.brightness !== undefined) {
            window.postMessage({ type: 'XP_BRIGHTNESS_CHANGED', brightness: data.brightness }, '*');
          }
          if (document.documentElement) {
            document.documentElement.setAttribute('data-xp-theme-mode', data.themeMode || 'light');
          }
          const overlaySettings = data.xpOverlaySettings || { masterEnabled: true };
          window.postMessage({
            type: 'XP_OVERLAY_SETTINGS_CHANGED',
            settings: overlaySettings
          }, '*');
        });
      }, { once: true });
    } else {
      chrome.storage.local.get(['themeMode'], (data) => {
        if (document.documentElement) {
          document.documentElement.setAttribute('data-xp-theme-mode', data.themeMode || 'light');
        }
      });
    }

    // 2. Respond to PING from simulator
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'XP_EXTENSION_PING' || event.data.type === 'XP_EXTENSION_CHECK') {
        chrome.storage.local.get(['openInIE', 'xpOverlaySettings', 'enableMemePack', 'keepWindowsOpen', 'singleClickOpen', 'brightness'], (res) => {
          const currentOpenInIE = res.openInIE !== false;
          const currentMemePack = res.enableMemePack === true;
          const currentKeepWindows = res.keepWindowsOpen === true;
          const currentSingleClick = res.singleClickOpen === true;
          applyBridgeState(currentOpenInIE, currentMemePack, currentKeepWindows, currentSingleClick);
          window.postMessage({
            type: 'XP_EXTENSION_STATUS',
            installed: true,
            enabled: true,
            openInIE: currentOpenInIE,
            enableMemePack: currentMemePack,
            keepWindowsOpen: currentKeepWindows,
            singleClickOpen: currentSingleClick,
            games: false
          }, '*');
          if (res.brightness !== undefined) {
            window.postMessage({ type: 'XP_BRIGHTNESS_CHANGED', brightness: res.brightness }, '*');
            try { localStorage.setItem('xp_site_brightness', String(res.brightness)); } catch (_) {}
          }
          const overlaySettings = res.xpOverlaySettings || { masterEnabled: true };
          window.postMessage({
            type: 'XP_OVERLAY_SETTINGS_CHANGED',
            settings: overlaySettings
          }, '*');
        });
      }
    });

    // 3. Listen for runtime messages from popup
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === 'XP_EXTENSION_SETTINGS_CHANGED') {
        const newOpenInIE = msg.openInIE !== false;
        const newMemePack = msg.enableMemePack === true;
        const newKeepWindows = msg.keepWindowsOpen === true;
        const newSingleClick = msg.singleClickOpen === true;
        applyBridgeState(newOpenInIE, newMemePack, newKeepWindows, newSingleClick);
        window.postMessage({
          type: 'XP_EXTENSION_SETTINGS_CHANGED',
          openInIE: newOpenInIE,
          enableMemePack: newMemePack,
          keepWindowsOpen: newKeepWindows,
          singleClickOpen: newSingleClick
        }, '*');
        if (msg.themeMode && document.documentElement) {
          document.documentElement.setAttribute('data-xp-theme-mode', msg.themeMode);
        }
      }
      if (msg && msg.action === 'XP_IMPORT_BOOKMARKS') {
        try {
          window.postMessage({
            type: 'XP_CREATE_BOOKMARKS_FOLDER',
            bookmarks: msg.bookmarks,
            playSound: false
          }, '*');
        } catch (_) {}
      }
        if (msg && msg.action === 'XP_IMPORT_SHORTCUTS') {
        try {
          window.postMessage({
            type: 'XP_CREATE_SHORTCUTS_FOLDER',
            shortcuts: msg.shortcuts,
            playSound: false
          }, '*');
        } catch (_) {}
      }
      if (msg && msg.action === 'XP_OVERLAY_SETTINGS_CHANGED') {
        try {
          window.postMessage({
            type: 'XP_OVERLAY_SETTINGS_CHANGED',
            settings: msg.settings
          }, '*');
        } catch (_) {}
      }
      if (msg && msg.action === 'XP_EXTENSION_SHARE_SYNC' && msg.share) {
        try {
          window.postMessage({
            type: 'XP_EXTENSION_SHARE_SYNC',
            share: msg.share
          }, '*');
        } catch (_) {}
      }
      if (msg && msg.action === 'XP_BRIGHTNESS_CHANGED') {
        try {
          window.postMessage({ type: 'XP_BRIGHTNESS_CHANGED', brightness: msg.brightness }, '*');
          localStorage.setItem('xp_site_brightness', String(msg.brightness));
        } catch (_) {}
      }
      if (msg && msg.action === 'XP_FS_CREATE_APP') {
        const reqId = 'req_' + Date.now();
        const handler = (e) => {
          if (e.data && e.data.type === 'XP_FS_CREATE_APP_RES' && e.data.requestId === reqId) {
            window.removeEventListener('message', handler);
            sendResponse && sendResponse({ success: true, app: e.data.app });
          }
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'XP_FS_CREATE_APP', requestId: reqId, app: msg.app }, '*');
        return true;
      }
      if (msg && msg.action === 'XP_FS_LIST_DIR') {
        const reqId = 'req_' + Date.now();
        const handler = (e) => {
          if (e.data && e.data.type === 'XP_FS_LIST_DIR_RES' && e.data.requestId === reqId) {
            window.removeEventListener('message', handler);
            sendResponse && sendResponse({ success: true, items: e.data.items });
          }
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'XP_FS_LIST_DIR', requestId: reqId, parentId: msg.parentId }, '*');
        return true;
      }
    });

    function syncBookmarksSilently() {
      try {
        chrome.runtime.sendMessage({ action: 'XP_GET_BOOKMARKS_TREE' }, (res) => {
          if (res && res.success && Array.isArray(res.bookmarks) && res.bookmarks.length > 0) {
            window.postMessage({
              type: 'XP_CREATE_BOOKMARKS_FOLDER',
              bookmarks: res.bookmarks,
              playSound: false
            }, '*');
          }
        });
      } catch (_) {}
    }

    function syncShortcutsSilently() {
      try {
        chrome.runtime.sendMessage({ action: 'XP_GET_TOP_SITES' }, (res) => {
          if (res && res.success && Array.isArray(res.shortcuts) && res.shortcuts.length > 0) {
            window.postMessage({
              type: 'XP_CREATE_SHORTCUTS_FOLDER',
              shortcuts: res.shortcuts,
              playSound: false
            }, '*');
          }
        });
      } catch (_) {}
    }

    // Listen for desktop first-time request or manual request
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'XP_GET_INITIAL_BOOKMARKS' || event.data.type === 'XP_GET_SAVED_BOOKMARKS') {
        syncBookmarksSilently();
      }
      if (event.data.type === 'XP_GET_INITIAL_SHORTCUTS' || event.data.type === 'XP_GET_SAVED_SHORTCUTS') {
        syncShortcutsSilently();
      }
      if (event.data.type === 'XP_READ_CLIPBOARD') {
        const reqId = event.data.requestId;
        try {
          chrome.runtime.sendMessage({ action: 'XP_READ_CLIPBOARD' }, (res) => {
            const text = (res && res.text) ? res.text : '';
            window.postMessage({ type: 'XP_CLIPBOARD_RESULT', requestId: reqId, text: text }, '*');
          });
        } catch (_) {
          window.postMessage({ type: 'XP_CLIPBOARD_RESULT', requestId: reqId, text: '' }, '*');
        }
      }
      if (event.data.type === 'XP_SHARE_UPDATE' && event.data.share) {
        try {
          chrome.runtime.sendMessage({ action: 'XP_SHARE_UPDATE', share: event.data.share });
        } catch (_) {}
      }
      if (event.data.type === 'XP_SHARE_REMOVE' && event.data.id) {
        try {
          chrome.runtime.sendMessage({ action: 'XP_SHARE_REMOVE', id: event.data.id });
        } catch (_) {}
      }
      if (event.data.type === 'XP_GET_SHARES') {
        try {
          chrome.runtime.sendMessage({ action: 'XP_GET_SHARES' }, (res) => {
            if (res && Array.isArray(res.shares)) {
              window.postMessage({ type: 'XP_SHARES_RESULT', shares: res.shares }, '*');
            }
          });
        } catch (_) {}
      }
      if (event.data.type === 'XP_LAN_FETCH') {
        const reqId = event.data.requestId;
        try {
          chrome.runtime.sendMessage({
            action: 'XP_LAN_FETCH',
            url: event.data.url,
            method: event.data.method || 'GET',
            headers: event.data.headers || {},
            body: event.data.body
          }, (res) => {
            window.postMessage({
              type: 'XP_LAN_FETCH_RESULT',
              requestId: reqId,
              ...(res || { success: false, error: 'No response from extension background' })
            }, '*');
          });
        } catch (err) {
          window.postMessage({
            type: 'XP_LAN_FETCH_RESULT',
            requestId: reqId,
            success: false,
            error: err.message
          }, '*');
        }
      }
    });

    function checkAndPushClipboard() {
      try {
        chrome.runtime.sendMessage({ action: 'XP_READ_CLIPBOARD' }, (res) => {
          if (res && res.text) {
            window.postMessage({ type: 'XP_CLIPBOARD_RESULT', text: res.text }, '*');
          }
        });
      } catch (_) {}
    }

    window.addEventListener('focus', checkAndPushClipboard);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAndPushClipboard();
      }
    });


    // 4. Listen for storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.openInIE !== undefined) {
        chrome.storage.local.get(['openInIE'], (res) => {
          applyBridgeState(res.openInIE !== false);
        });
      }
    });
  }

  const isTopWindow = (window.self === window.top);
  const isExtensionIframe = Boolean(
    window.location.ancestorOrigins &&
    window.location.ancestorOrigins.length === 1 &&
    window.location.ancestorOrigins[0].startsWith('chrome-extension://')
  );

  // Initialize extension detection bridge for simulator (top window or newtab iframe)
  if (isTopWindow || isExtensionIframe) {
    initSimulatorBridge();
    if (isTopWindow) return;
  }

  // Validate URL scheme
  const currentHref = window.location.href;
  if (!currentHref.startsWith('http://') && !currentHref.startsWith('https://')) return;

  // Inject isolated OS styles for Remote Access Services (copy.sh, pcjs.org, distrosea.com)
  if (window.location.hostname.includes('copy.sh')) {
    const applyV86 = () => {
      try {
        if (document.getElementById('xp-v86-content-style')) return;
        const s = document.createElement('style');
        s.id = 'xp-v86-content-style';
        s.textContent = `
          html, body { background: #000 !important; color: #fff !important; margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important; overflow: hidden !important; }
          body > *:not(#screen_container), #boot_options, #runtime_options, #runtime_infos, #description, #links, #filesystem_panel, #terminal, #toggle_ui, #theatre_background, code, h1, h2, h3, h4, hr, footer, header { display: none !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; width: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          #screen_container { display: flex !important; align-items: center !important; justify-content: center !important; position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; background: #000 !important; z-index: 999999 !important; overflow: hidden !important; }
          #vga { display: block !important; max-width: 100vw !important; max-height: 100vh !important; width: 100% !important; height: 100% !important; object-fit: contain !important; image-rendering: pixelated !important; margin: auto !important; }
          #screen { max-width: 100vw !important; max-height: 100vh !important; margin: auto !important; font-family: monospace !important; }
        `;
        (document.head || document.documentElement).appendChild(s);
      } catch (_) {}
    };
    applyV86();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyV86);
    window.addEventListener('load', applyV86);
    const t = setInterval(applyV86, 500);
    setTimeout(() => clearInterval(t), 10000);
  }

  if (window.location.hostname.includes('pcjs.org')) {
    const applyPcjs = () => {
      try {
        if (document.getElementById('xp-pcjs-content-style')) return;
        const s = document.createElement('style');
        s.id = 'xp-pcjs-content-style';
        s.textContent = `
          html, body { background: #000 !important; color: #fff !important; margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important; overflow: hidden !important; }
          header, footer, .menu, #pcjs-machines, #pcjs-heading, .pcjs-name, .pcjs-title, .pcjs-copyright, .pcjs-reference, .pcjs-controls, .pcjs-control, .pcjs-button, .pcjs-status, .pcjs-description, .pcjs-registers, .pcjs-panel, .pcjs-fieldset, .machine-warning, .language-plaintext, .highlight, .pcjs-explorer, h1, h2, h3, h4, hr, p { display: none !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          .wrapper, section { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; border: none !important; background: #000 !important; overflow: hidden !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 10 !important; }
          .machine-placeholder, .pcjs-machine, .pcjs-chassis, .pcjs-video, .pcjs-monitor, .pcjs-surface { position: relative !important; margin: 0 !important; padding: 0 !important; border: none !important; background: #000 !important; display: flex !important; align-items: center !important; justify-content: center !important; max-width: 100vw !important; max-height: 100vh !important; }
          .pcjs-screen { margin: auto !important; display: flex !important; align-items: center !important; justify-content: center !important; max-width: 100vw !important; max-height: 100vh !important; background: #000 !important; }
          canvas.pcjs-canvas { display: block !important; max-width: 100vw !important; max-height: 100vh !important; width: auto !important; height: auto !important; object-fit: contain !important; image-rendering: pixelated !important; margin: auto !important; }
          textarea.pcjs-overlay { position: absolute !important; inset: 0 !important; max-width: 100vw !important; max-height: 100vh !important; margin: auto !important; opacity: 0 !important; }
        `;
        (document.head || document.documentElement).appendChild(s);
      } catch (_) {}
    };
    applyPcjs();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPcjs);
    window.addEventListener('load', applyPcjs);
    const pt = setInterval(applyPcjs, 500);
    setTimeout(() => clearInterval(pt), 10000);
  }

  // Filter out ad / tracking / metrics iframes
  const ignoredDomains = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleads',
    'adnxs.com',
    'scorecardresearch.com',
    'moatads.com',
    'fls-na.amazon.com',
    'youtube.com/live_chat'
  ];
  if (ignoredDomains.some(d => window.location.hostname.includes(d) || currentHref.includes(d))) {
    return;
  }

  // Ensure this frame is hosted by the simulator
  try {
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      const isSim = Array.from(window.location.ancestorOrigins).some(origin =>
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.startsWith('chrome-extension://') ||
        origin.includes('vercel.app') ||
        origin.includes('elmehdikhalda')
      );
      if (!isSim) return;
    }
  } catch (_) {}

  // Filter out deeply nested subframes (depth >= 3: ad inside page inside IE inside Desktop)
  try {
    if (window.parent && window.parent !== window.top && window.parent.parent && window.parent.parent !== window.top) {
      return;
    }
  } catch (_) {}

  function postNavigation() {
    try {
      const url = window.location.href;
      if (!url || !url.startsWith('http') || url.includes('about:blank')) return;

      const title = document.title;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'IE_FRAME_NAVIGATED', url, title }, '*');
      }
      if (window.top && window.top !== window && window.top !== window.parent) {
        window.top.postMessage({ type: 'IE_FRAME_NAVIGATED', url, title }, '*');
      }
    } catch (e) {}
  }

  postNavigation();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', postNavigation);
  }
  window.addEventListener('load', postNavigation);
  window.addEventListener('popstate', postNavigation);
  window.addEventListener('hashchange', postNavigation);
  window.addEventListener('yt-navigate-finish', postNavigation);

  let lastHref = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      postNavigation();
    }
  }, 500);
})();
