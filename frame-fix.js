/**
 * Windows XP Simulator - Main World YouTube Frame Fix
 * Runs in MAIN world at document_start.
 * ONLY runs when YouTube is embedded inside an iframe in the XP simulator!
 */
(function() {
  // Expose extension presence synchronously in MAIN world
  try {
    window.__XP_EXTENSION_INSTALLED__ = true;
    if (!window.__XP_EXTENSION__) {
      window.__XP_EXTENSION__ = {
        installed: true,
        enabled: true,
        openInIE: true
      };
    }
    if (document.documentElement) {
      document.documentElement.setAttribute('data-xp-extension', 'true');
      document.documentElement.style.setProperty('color-scheme', 'light', 'important');
    }

    // Force Light Mode by default so web pages treat user's browser as Light Mode
    const origMatchMedia = window.matchMedia;
    window.matchMedia = function(query) {
      if (typeof query === 'string' && query.includes('prefers-color-scheme')) {
        const themeMode = document.documentElement.getAttribute('data-xp-theme-mode') || 'light';
        const wantDark = (themeMode === 'dark');
        const matches = query.includes('dark') ? wantDark : !wantDark;
        return {
          matches: matches,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true
        };
      }
      return origMatchMedia.call(window, query);
    };

    // Polyfill/safe-guard WakeLock API in frames to prevent permissions policy rejections from crashing Emscripten/WASM
    try {
      if (typeof navigator !== 'undefined') {
        Object.defineProperty(navigator, 'wakeLock', {
          value: {
            request: function() {
              return Promise.resolve({
                release: function() { return Promise.resolve(); },
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function() { return true; }
              });
            }
          },
          configurable: true,
          writable: true
        });
      }
    } catch (_) {}
  } catch (_) {}

  // If top level (regular YouTube in browser tab), NEVER run!
  if (window.self === window.top) return;

  // In an iframe: verify ancestor origin if available, or default to true so it works in the simulator
  let isSimulator = true;
  try {
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      isSimulator = Array.from(window.location.ancestorOrigins).some(origin => 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.startsWith('chrome-extension://') ||
        origin.includes('vercel.app') ||
        origin.includes('elmehdikhalda') ||
        origin.includes('192.168.') ||
        origin.includes('10.') ||
        origin.includes('::1') ||
        origin.includes('0.0.0.0')
      );
    }
  } catch (e) {}
  if (!isSimulator) return;

  // NEVER spoof top or parent on the simulator's own internal frames (live wallpaper, local apps)
  const isInternalFrame = window.location.hostname.includes('localhost') ||
                          window.location.hostname.includes('127.0.0.1') ||
                          window.location.hostname.includes('vercel.app') ||
                          window.location.hostname.includes('elmehdikhalda') ||
                          window.location.pathname.includes('/live_background_dist/') ||
                          window.location.pathname.includes('/html/');
  if (isInternalFrame) return;

  // Spoof top, parent, and frameElement so YouTube acts as a standalone browser window
  try {
    Object.defineProperty(window, 'top', {
      get: () => window,
      set: () => {},
      configurable: true
    });
  } catch (e) {}

  try {
    Object.defineProperty(window, 'parent', {
      get: () => window,
      set: () => {},
      configurable: true
    });
  } catch (e) {}

  try {
    Object.defineProperty(window, 'frameElement', {
      get: () => null,
      set: () => {},
      configurable: true
    });
  } catch (e) {}

  // Spoof document.referrer to YouTube origin so player tokens remain valid
  try {
    Object.defineProperty(document, 'referrer', {
      get: () => 'https://www.youtube.com/',
      configurable: true
    });
  } catch (e) {}

  // Fix cross-subdomain postMessage targetOrigin mismatches (e.g. google.com vs ogs.google.com)
  try {
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin, transfer) {
      if (!targetOrigin || targetOrigin === 'undefined' || (typeof targetOrigin === 'string' && targetOrigin !== '*' && !targetOrigin.startsWith('/'))) {
        targetOrigin = '*';
      }
      try {
        return originalPostMessage.call(this, message, targetOrigin, transfer);
      } catch (e) {
        return originalPostMessage.call(this, message, '*', transfer);
      }
    };
  } catch (e) {}

  // Prevent link breakouts (_top, _parent) from escaping Internet Explorer simulation
  try {
    document.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a) {
        if (a.target === '_top' || a.target === '_parent') {
          a.target = '_self';
        }
      }
    }, true);
  } catch (e) {}

  // Inject authoritative sizing and anti-preview CSS for smooth wide-window mounts
  const injectAuthoritativePlayerStyles = () => {
    try {
      if (document.getElementById('xp-authoritative-player-style')) return;
      const style = document.createElement('style');
      style.id = 'xp-authoritative-player-style';
      style.textContent = `
        #thumbnail > #mouseover-overlay,
        ytd-thumbnail #hover-overlays,
        ytd-video-preview,
        ytd-video-preview[mini-mode],
        ytd-inline-preview-renderer,
        #inline-preview-player,
        ytd-thumbnail-overlay-inline-playback-renderer {
          display: none !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
        ytd-watch-flexy[flexy][is-two-columns_] #primary.ytd-watch-flexy {
          max-width: 1280px !important;
          min-width: 360px !important;
        }
        ytd-watch-flexy #player-container-inner,
        ytd-watch-flexy #player-container-outer {
          min-height: 240px !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  };

  injectAuthoritativePlayerStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAuthoritativePlayerStyles);
  }

  // Playback Watchdog: ensures video playback initiates cleanly when opened in wide window
  function initPlaybackWatchdog() {
    let attempted = false;
    const checkAndPlay = () => {
      if (attempted) return;
      const player = document.getElementById('movie_player');
      const video = document.querySelector('video.html5-main-video');
      if (video && video.paused && video.readyState >= 2) {
        attempted = true;
        video.play().catch(() => {
          if (player && typeof player.playVideo === 'function') {
            player.playVideo();
          }
        });
      }
    };
    
    const observer = new MutationObserver(() => {
      checkAndPlay();
    });
    
    const startObserver = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        checkAndPlay();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserver);
    } else {
      startObserver();
    }
  }
  initPlaybackWatchdog();

  // Normalize target URL (handling /shorts/ and cleaning parameter noise like themeRefresh)
  function normalizeVideoUrl(rawUrl) {
    if (!rawUrl) return null;
    let url = rawUrl;
    if (url.includes('/shorts/')) {
      const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        url = 'https://www.youtube.com/watch?v=' + match[1];
      }
    }
    if (url.includes('/watch?v=')) {
      url = url.replace(/([?&])themeRefresh=\d+&?/, '$1').replace(/[?&]$/, '');
      return url;
    }
    return null;
  }

  function handleVideoNavigation(targetUrl) {
    const normalized = normalizeVideoUrl(targetUrl);
    if (!normalized) return false;

    try {
      const currentUrlObj = new URL(window.location.href);
      const targetUrlObj = new URL(normalized, window.location.origin);
      const currentVid = currentUrlObj.searchParams.get('v');
      const targetVid = targetUrlObj.searchParams.get('v');

      // Only perform clean full-page load when switching to a video
      if (targetVid && targetVid !== currentVid) {
        window.location.href = targetUrlObj.href;
        return true;
      }
    } catch (_) {}
    return false;
  }

  // 1. Intercept user clicks across standard DOM and Shadow DOM
  document.addEventListener('click', (e) => {
    let targetUrl = null;
    const path = e.composedPath ? e.composedPath() : [e.target];
    for (const el of path) {
      if (el && el.tagName === 'A' && el.href) {
        targetUrl = el.href;
        break;
      }
      if (el && el.getAttribute && el.getAttribute('href')) {
        targetUrl = el.getAttribute('href');
        break;
      }
    }

    if (targetUrl && handleVideoNavigation(targetUrl)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  // 2. Intercept YouTube SPA router calls (history.pushState / replaceState)
  try {
    const originalPushState = history.pushState;
    history.pushState = function(state, title, url) {
      if (url) {
        try {
          const fullUrl = new URL(url, window.location.origin).href;
          if (handleVideoNavigation(fullUrl)) {
            return;
          }
        } catch (_) {}
      }
      return originalPushState.apply(this, arguments);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(state, title, url) {
      if (url) {
        try {
          const fullUrl = new URL(url, window.location.origin).href;
          if (handleVideoNavigation(fullUrl)) {
            return;
          }
        } catch (_) {}
      }
      return originalReplaceState.apply(this, arguments);
    };
  } catch (_) {}

  // 3. Intercept YouTube router custom event (yt-navigate-start)
  window.addEventListener('yt-navigate-start', (e) => {
    try {
      const url = e && e.detail && e.detail.url;
      if (url) {
        const fullUrl = new URL(url, window.location.origin).href;
        handleVideoNavigation(fullUrl);
      }
    } catch (_) {}
  }, true);
})();
