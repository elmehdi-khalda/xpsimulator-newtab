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

    // Auto-isolate & auto-start Retro Runtime.net app frames inside Windows XP Simulator
    if (window.location.hostname.includes('Retro Runtime.net')) {
      const injectVimmStyles = () => {
        try {
          if (document.getElementById('xp-Retro Runtime-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-Retro Runtime-style';
          style.textContent = `
            *, *::before, *::after { box-sizing: border-box; }
            html, body {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              overflow: hidden !important; background: #000 !important;
            }
            body > *:not(#main):not(script):not(style):not(link):not(noscript) {
              display: none !important; visibility: hidden !important; pointer-events: none !important;
            }
            div.innerMenu, div.sidebarContainer, main.mainContent > h2, main.mainContent > nav,
            main.mainContent > div.centered > div:not(#app):not(.ejs_parent) {
              display: none !important;
            }
            div#main, div.innerMain, main.mainContent, div.centered {
              position: fixed !important; inset: 0 !important;
              width: 100vw !important; height: 100vh !important;
              margin: 0 !important; padding: 0 !important;
              display: flex !important; flex-direction: column !important;
              align-items: center !important; justify-content: center !important;
              overflow: hidden !important; background: #000 !important;
              border: none !important; aspect-ratio: unset !important;
            }
            #app, .ejs_parent, .ejs_small_screen, .ejs_big_screen {
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; max-height: none !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
            }
            .ejs_start_button {
              position: absolute !important; top: 50% !important; left: 50% !important;
              transform: translate(-50%, -50%) !important; z-index: 9999999 !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              padding: 18px 36px !important; font-size: 24px !important; font-weight: bold !important;
              color: #fff !important; background: #1aafff !important; border-radius: 8px !important;
              box-shadow: 0 0 20px rgba(26, 175, 255, 0.6) !important; cursor: pointer !important;
              visibility: visible !important; opacity: 1 !important; pointer-events: auto !important;
            }
            canvas {
              image-rendering: pixelated !important; width: 100% !important; height: 100% !important;
              object-fit: contain !important; outline: none !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };

      injectVimmStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectVimmStyles);
      }

      function tryClickVimmStart() {
        var btn = document.querySelector('.ejs_start_button');
        if (btn) {
          setTimeout(function() { try { btn.click(); } catch (_) {} }, 400);
        } else {
          setTimeout(tryClickVimmStart, 200);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryClickVimmStart);
      } else {
        tryClickVimmStart();
      }
    }

    // Auto-isolate & hook runtime app frames (3D App III)
    if (window.location.hostname.includes('runtime')) {
      try {
        localStorage.setItem('tapp.launcher.torrentAllowed', 'false');
        localStorage.setItem('tapp.launcher.torrentRemindLater', String(Date.now()));
      } catch (_) {}

      // Intercept .torrent-launcher attributes to use direct S3 7z archive download (300MB vs stalled 920MB WebTorrent)
      const S3_GTA3_7Z = 'https://s3.ru1.storage.beget.cloud/68bbc47d0de7-runtime-archive/3D App-assets.7z';

      const patchLauncher = (el) => {
        if (!el || !el.setAttribute) return;
        const tid = el.getAttribute('data-torrent-id');
        if (!tid || tid === '3D App-assets' || window.location.pathname.includes('regta3')) {
          el.setAttribute('data-torrent-7z', S3_GTA3_7Z);
          el.setAttribute('data-torrent-7z-delay', '0');
        }
      };

      try {
        const origGetAttr = Element.prototype.getAttribute;
        Element.prototype.getAttribute = function(name) {
          if (this && this.classList && this.classList.contains('torrent-launcher')) {
            const tid = origGetAttr.call(this, 'data-torrent-id');
            if (!tid || tid === '3D App-assets' || window.location.pathname.includes('regta3')) {
              if (name === 'data-torrent-7z') return S3_GTA3_7Z;
              if (name === 'data-torrent-7z-delay') return '0';
            }
          }
          return origGetAttr.apply(this, arguments);
        };

        const origHasAttr = Element.prototype.hasAttribute;
        Element.prototype.hasAttribute = function(name) {
          if (this && this.classList && this.classList.contains('torrent-launcher')) {
            if (name === 'data-torrent-7z' || name === 'data-torrent-7z-delay') return true;
          }
          return origHasAttr.apply(this, arguments);
        };
      } catch (_) {}

      const triggerLauncherIframe = () => {
        try {
          const iframe = document.getElementById('torrent-launcher-iframe');
          const launcher = document.querySelector('.torrent-launcher');
          if (!iframe) return;

          const pageText = (document.body && document.body.innerText) || '';
          const hasError = pageText.includes('Torrent client not initialized') || pageText.includes('unexpected error');

          if (hasError) {
            const targetSrc = (launcher && launcher.getAttribute('data-iframe-src')) || 'https://runtime/regta3/v3/index.html';
            if (!iframe.src || iframe.src === 'about:blank' || iframe.src.includes('about:blank')) {
              iframe.src = targetSrc;
            }
            iframe.hidden = false;
            iframe.removeAttribute('hidden');
            iframe.style.setProperty('display', 'block', 'important');
            iframe.style.setProperty('width', '100vw', 'important');
            iframe.style.setProperty('height', '100vh', 'important');
            iframe.style.setProperty('position', 'fixed', 'important');
            iframe.style.setProperty('inset', '0', 'important');
            iframe.style.setProperty('z-index', '999999', 'important');
            iframe.focus();
            if (launcher) launcher.style.setProperty('display', 'none', 'important');
          }
        } catch (_) {}
      };

      try {
        window.addEventListener('error', (e) => {
          if (e && e.message && e.message.includes('Torrent client not initialized')) {
            e.preventDefault();
            e.stopPropagation();
            triggerLauncherIframe();
          }
        }, true);
        window.addEventListener('unhandledrejection', (e) => {
          if (e && e.reason && String(e.reason).includes('Torrent client not initialized')) {
            e.preventDefault();
            e.stopPropagation();
            triggerLauncherIframe();
          }
        }, true);
      } catch (_) {}

      try {
        const obs = new MutationObserver((mutations) => {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType === 1) {
                if (node.classList && node.classList.contains('torrent-launcher')) {
                  patchLauncher(node);
                } else if (node.querySelectorAll) {
                  const items = node.querySelectorAll('.torrent-launcher');
                  for (const it of items) patchLauncher(it);
                }
              }
            }
          }
          triggerLauncherIframe();
        });
        obs.observe(document.documentElement || document, { childList: true, subtree: true, characterData: true });
      } catch (_) {}

      setInterval(triggerLauncherIframe, 400);

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          patchLauncher(document.querySelector('.torrent-launcher'));
          triggerLauncherIframe();
        });
      } else {
        patchLauncher(document.querySelector('.torrent-launcher'));
        triggerLauncherIframe();
      }
    }

    // Auto-launch 3D WebAssembly (WASM Engine Web) directly without manual clicks
    if (window.location.hostname.includes('pixelsuft.github.io')) {
      let started = false;
      const tryStartHL = () => {
        if (started) return;
        const btn = document.querySelector('input[value*="Launch WASM Engine"]');
        if (btn) {
          started = true;
          try { btn.click(); } catch (_) {}
          return;
        }
        if (typeof window.startXash === 'function') {
          const status = document.getElementById('status');
          const txt = (status && status.innerText) || '';
          if (txt.includes('downloaded') || txt.includes('Scripts downloaded')) {
            started = true;
            try { window.startXash(); } catch (_) {}
          }
        }
      };
      setInterval(tryStartHL, 300);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryStartHL);
      } else {
        tryStartHL();
      }
    }

    // Auto-isolate & auto-start Web Runtimes.cz app frames (Alone in the Dark)
    if (window.location.hostname.includes('Web Runtimes.cz')) {
      // Stub Google AdSense to prevent "TagError: No slot size for availableWidth=0"
      try {
        window.adsbygoogle = {
          push: function() { return 0; },
          loaded: true
        };
      } catch (_) {}

      const injectRetrogamesStyles = () => {
        try {
          if (document.getElementById('xp-Web Runtimes-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-Web Runtimes-style';
          style.textContent = `
            html, body {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              overflow: hidden !important; background: #000 !important;
            }
            #dosbox, .dosbox-container, .dosbox-canvas, canvas {
              position: fixed !important; inset: 0 !important;
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; max-height: none !important;
              object-fit: contain !important; background: #000 !important;
              z-index: 99999 !important;
            }
            .dosbox-overlay {
              position: fixed !important; inset: 0 !important;
              z-index: 100000 !important;
            }
            .dosbox-start {
              position: absolute !important; top: 50% !important; left: 50% !important;
              transform: translate(-50%, -50%) !important;
              padding: 14px 28px !important; font-size: 20px !important; font-weight: bold !important;
              color: #fff !important; background: #1aafff !important; border-radius: 8px !important;
              cursor: pointer !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };
      injectRetrogamesStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectRetrogamesStyles);
      }

      function tryClickDosboxStart() {
        var btn = document.querySelector('.dosbox-start');
        if (btn) {
          setTimeout(function() { try { btn.click(); } catch (_) {} }, 400);
        } else {
          setTimeout(tryClickDosboxStart, 200);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryClickDosboxStart);
      } else {
        tryClickDosboxStart();
      }
    }

    // Intercept itch.io embed-hotlink redirect
    try {
      const origAssign = window.location.assign;
      const origReplace = window.location.replace;
      const blockHotlink = (url) => {
        return typeof url === 'string' && url.includes('embed-hotlink');
      };
      if (origAssign) {
        window.location.assign = function(url) {
          if (blockHotlink(url)) return;
          return origAssign.call(window.location, url);
        };
      }
      if (origReplace) {
        window.location.replace = function(url) {
          if (blockHotlink(url)) return;
          return origReplace.call(window.location, url);
        };
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