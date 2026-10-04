/**
 * Windows XP Simulator - Frame Integration Content Script
 * Synchronizes address bar & title with Internet Explorer simulation.
 * Runs in ISOLATED world.
 */

(function () {
  // Helper to sync extension state to the simulator window
  function initSimulatorBridge() {
    function applyBridgeState(openInIE) {
      const openInIeStr = String(openInIE);

      if (document.documentElement) {
        document.documentElement.setAttribute('data-xp-extension', 'true');
        document.documentElement.setAttribute('data-xp-extension-open-in-ie', openInIeStr);
      }

      try {
        localStorage.setItem('xp_extension_installed', 'true');
        localStorage.setItem('xp_extension_enabled', 'true');
        localStorage.setItem('xp_extension_open_in_ie', openInIeStr);
      } catch (_) {}


      try {
        window.postMessage({
          type: 'XP_EXTENSION_READY',
          installed: true,
          enabled: true,
          openInIE: openInIE
        }, '*');
        window.dispatchEvent(new CustomEvent('xp-extension-status', {
          detail: { installed: true, enabled: true, openInIE: openInIE }
        }));
      } catch (_) {}
    }

    // 1. Initial load from storage
    chrome.storage.local.get(['openInIE', 'xpOverlaySettings'], (data) => {
      const openInIE = data.openInIE !== false;
      applyBridgeState(openInIE);
      if (data.xpOverlaySettings) {
        window.postMessage({
          type: 'XP_OVERLAY_SETTINGS_CHANGED',
          settings: data.xpOverlaySettings
        }, '*');
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        chrome.storage.local.get(['openInIE', 'xpOverlaySettings'], (data) => {
          applyBridgeState(data.openInIE !== false);
          if (data.xpOverlaySettings) {
            window.postMessage({
              type: 'XP_OVERLAY_SETTINGS_CHANGED',
              settings: data.xpOverlaySettings
            }, '*');
          }
        });
      }, { once: true });
    }

    // 2. Respond to PING from simulator
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'XP_EXTENSION_PING' || event.data.type === 'XP_EXTENSION_CHECK') {
        chrome.storage.local.get(['openInIE', 'xpOverlaySettings'], (res) => {
          const currentOpenInIE = res.openInIE !== false;
          applyBridgeState(currentOpenInIE);
          window.postMessage({
            type: 'XP_EXTENSION_STATUS',
            installed: true,
            enabled: true,
            openInIE: currentOpenInIE
          }, '*');
          if (res.xpOverlaySettings) {
            window.postMessage({
              type: 'XP_OVERLAY_SETTINGS_CHANGED',
              settings: res.xpOverlaySettings
            }, '*');
          }
        });
      }
    });

    // 3. Listen for runtime messages from popup
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === 'XP_EXTENSION_SETTINGS_CHANGED') {
        const newOpenInIE = msg.openInIE !== false;
        applyBridgeState(newOpenInIE);
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
    });


    // 4. Listen for storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.openInIE !== undefined) {
        applyBridgeState(changes.openInIE.newValue !== false);
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
