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

    // Forward ESC key press to parent XP Simulator window to exit fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'xp-exit-fullscreen' }, '*');
          }
        } catch (_) {}
      }
    }, { capture: true, passive: false });

    // Hook Window.prototype.postMessage to prevent dropped messages due to cross-subdomain targetOrigin mismatches
    try {
      const origWindowPostMessage = Window.prototype.postMessage;
      Window.prototype.postMessage = function(message, targetOrigin, transfer) {
        if (typeof targetOrigin === 'string' && (targetOrigin.includes('ziziyi.com') || targetOrigin.includes('office-editor'))) {
          targetOrigin = '*';
        }
        try {
          return origWindowPostMessage.apply(this, arguments);
        } catch (e) {
          try {
            return origWindowPostMessage.call(this, message, '*', transfer);
          } catch (_) {}
        }
      };
    } catch (_) {}

    // Allow MessageEvent.origin to be accepted across ziziyi subdomains (office-editor.ziziyi.com -> office.ziziyi.com)
    try {
      const origEventOriginDesc = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'origin');
      if (origEventOriginDesc && origEventOriginDesc.get) {
        const origOriginGet = origEventOriginDesc.get;
        Object.defineProperty(MessageEvent.prototype, 'origin', {
          get: function() {
            const orig = origOriginGet.call(this);
            if (orig && orig.includes('office-editor.ziziyi.com') && window.location.hostname.includes('office.ziziyi.com')) {
              return window.location.origin;
            }
            return orig;
          },
          configurable: true
        });
      }
    } catch (_) {}

    // Filter egui / eframe unhandled viewport command warnings and sync document.title
    try {
      const origConsoleWarn = console.warn;
      console.warn = function(...args) {
        if (typeof args[0] === 'string' && args[0].includes('Unhandled egui viewport command: Title')) {
          const match = args[0].match(/Title\("([^"]+)"\)/);
          if (match && match[1]) {
            try { document.title = match[1]; } catch (_) {}
          }
          return; // Suppress continuous console spam in animation loop
        }
        return origConsoleWarn.apply(console, args);
      };
    } catch (_) {}

    // Ensure dynamically clicked anchor elements with download attribute are attached to DOM and trigger download
    try {
      const origAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download && this.href) {
          if (!document.documentElement.contains(this)) {
            (document.body || document.documentElement).appendChild(this);
            setTimeout(() => { try { this.remove(); } catch (_) {} }, 2000);
          }
        }
        return origAnchorClick.apply(this, arguments);
      };
    } catch (_) {}

    // Ensure WebAssembly streaming compilation falls back gracefully without console errors
    try {
      if (typeof WebAssembly !== 'undefined' && WebAssembly.instantiateStreaming) {
        const origInstantiateStreaming = WebAssembly.instantiateStreaming;
        WebAssembly.instantiateStreaming = async function(source, importObject) {
          try {
            return await origInstantiateStreaming.call(this, source, importObject);
          } catch (e) {
            try {
              const resp = await source;
              const buf = await resp.arrayBuffer();
              return await WebAssembly.instantiate(buf, importObject);
            } catch (err2) {
              throw e;
            }
          }
        };
      }
    } catch (_) {}

    // Fix TypeError: child.setAttribute is not a function when third-party SVG icon injecters iterate childNodes
    try {
      if (typeof Node !== 'undefined' && !Node.prototype.setAttribute) {
        Node.prototype.setAttribute = function(name, value) {
          if (this instanceof Element) {
            Element.prototype.setAttribute.call(this, name, value);
          }
        };
      }
    } catch (_) {}

    // Polyfill / safe-guard showOpenFilePicker for cross-origin subframes
    try {
      if (typeof window.showOpenFilePicker === 'function') {
        const origShowOpenFilePicker = window.showOpenFilePicker;
        window.showOpenFilePicker = async function(options) {
          try {
            return await origShowOpenFilePicker.call(window, options);
          } catch (err) {
            if (err && (err.name === 'SecurityError' || String(err).includes('sub frames') || String(err).includes('Cross origin'))) {
              return new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                if (options && options.multiple) input.multiple = true;
                if (options && options.types && Array.isArray(options.types)) {
                  const exts = [];
                  for (const t of options.types) {
                    if (t.accept) {
                      for (const [mime, extList] of Object.entries(t.accept)) {
                        exts.push(mime);
                        if (Array.isArray(extList)) exts.push(...extList);
                      }
                    }
                  }
                  if (exts.length) input.accept = exts.join(',');
                }
                input.style.position = 'fixed';
                input.style.top = '-9999px';
                input.style.opacity = '0';
                (document.body || document.documentElement).appendChild(input);
                input.onchange = () => {
                  const files = Array.from(input.files || []);
                  input.remove();
                  if (files.length === 0) {
                    reject(new DOMException('The user aborted a request.', 'AbortError'));
                    return;
                  }
                  const handles = files.map(file => ({
                    kind: 'file',
                    name: file.name,
                    getFile: async () => file,
                    createWritable: async () => { throw new Error('File writing not supported in fallback'); }
                  }));
                  resolve(options && options.multiple ? handles : handles);
                };
                input.oncancel = () => {
                  input.remove();
                  reject(new DOMException('The user aborted a request.', 'AbortError'));
                };
                input.click();
              });
            }
            throw err;
          }
        };
      }
    } catch (_) {}

    // Polyfill / safe-guard showSaveFilePicker for cross-origin subframes
    try {
      const origShowSaveFilePicker = window.showSaveFilePicker;
      window.showSaveFilePicker = async function(options) {
        if (window.self === window.top && typeof origShowSaveFilePicker === 'function') {
          try {
            return await origShowSaveFilePicker.call(window, options);
          } catch (err) {
            if (!err || (err.name !== 'SecurityError' && !String(err).includes('sub frames') && !String(err).includes('Cross origin'))) {
              throw err;
            }
          }
        }

        const fileName = (options && options.suggestedName) ? options.suggestedName : 'Document1.docx';
        const chunks = [];
        let savedFile = null;

        const mockWritableStream = {
          async write(data) {
            if (data && typeof data === 'object' && data.type === 'write' && data.data !== undefined) {
              chunks.push(data.data);
            } else if (data !== undefined) {
              chunks.push(data);
            }
          },
          async seek() {},
          async truncate() {},
          async close() {
            let mimeType = 'application/octet-stream';
            if (fileName.endsWith('.docx')) {
              mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            } else if (fileName.endsWith('.pdf')) {
              mimeType = 'application/pdf';
            } else if (fileName.endsWith('.xlsx')) {
              mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (fileName.endsWith('.pptx')) {
              mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            }
            const blob = new Blob(chunks, { type: mimeType });
            savedFile = new File([blob], fileName, { type: mimeType });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            (document.body || document.documentElement).appendChild(a);
            try {
              a.click();
            } finally {
              setTimeout(() => {
                try { a.remove(); URL.revokeObjectURL(url); } catch (_) {}
              }, 5000);
            }
          },
          getWriter() {
            return {
              write: (chunk) => mockWritableStream.write(chunk),
              close: () => mockWritableStream.close(),
              abort: () => Promise.resolve(),
              releaseLock: () => {}
            };
          }
        };

        const mockHandle = {
          kind: 'file',
          name: fileName,
          async getFile() {
            if (savedFile) return savedFile;
            const blob = new Blob(chunks);
            return new File([blob], fileName);
          },
          async createWritable() {
            chunks.length = 0;
            return mockWritableStream;
          },
          async isSameEntry(other) {
            return other && other.name === fileName;
          }
        };

        return mockHandle;
      };
    } catch (_) {}

    // ZIZIYI / Univer Office enhancements & banner removal
    try {
      const isZiziyi = window.location.hostname.includes('ziziyi.com');
      if (isZiziyi) {
        // Intercept non-existent fractional/scaled theme SVG icons synchronously before network request
        try {
          if (typeof window.fetch === 'function') {
            const origFetch = window.fetch;
            window.fetch = function(input, init) {
              let rawUrl = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
              if (typeof rawUrl === 'string' && rawUrl.includes('/resources/img/') && (rawUrl.includes('@') || rawUrl.endsWith('.svg'))) {
                if (rawUrl.includes('formats@') || rawUrl.includes('@2.5x') || rawUrl.includes('@1.25x') || rawUrl.includes('@1.75x') || rawUrl.includes('@1.5x')) {
                  return Promise.resolve(new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>', {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'image/svg+xml' }
                  }));
                }
              }
              return origFetch.call(this, input, init);
            };
          }
        } catch (_) {}

        // Hide and remove the promo banner: "Make your browser an Office app"
        try {
          const hideBannerStyle = document.createElement('style');
          hideBannerStyle.id = 'xp-hide-ziziyi-banner';
          hideBannerStyle.textContent = `
            div.p-4:has(a[href*="kjigcolnmdghbjgkcijcdahaobhkpngo"]),
            div:has(> div > div > div > p:first-child),
            a[href*="kjigcolnmdghbjgkcijcdahaobhkpngo"] {
              display: none !important;
            }
          `;
          (document.head || document.documentElement).appendChild(hideBannerStyle);

          const purgePromoBanner = () => {
            try {
              const banners = document.querySelectorAll('div.p-4, a[href*="kjigcolnmdghbjgkcijcdahaobhkpngo"]');
              for (const b of banners) {
                if (b.tagName === 'A' || (b.textContent && (b.textContent.includes('Make your browser an Office app') || b.textContent.includes('kjigcolnmdghbjgkcijcdahaobhkpngo')))) {
                  const container = b.closest('div.p-4') || b;
                  container.remove();
                }
              }
            } catch (_) {}
          };
          purgePromoBanner();
          const bannerObserver = new MutationObserver(purgePromoBanner);
          if (document.documentElement) {
            bannerObserver.observe(document.documentElement, { childList: true, subtree: true });
          }
          document.addEventListener('DOMContentLoaded', purgePromoBanner);
        } catch (_) {}
      }
    } catch (_) {}

    // Auto-isolate & auto-start Vimm.net game frames inside Windows XP Simulator
    if (window.location.hostname.includes('vimm.net')) {
      try {
        let _threads = false;
        Object.defineProperty(window, 'EJS_threads', {
          get: () => _threads,
          set: (val) => {
            _threads = (typeof SharedArrayBuffer === 'function') ? Boolean(val) : false;
          },
          configurable: true
        });
        const origGetItem = Storage.prototype.getItem;
        Storage.prototype.getItem = function(key) {
          if (key === 'ejs_threads' && typeof SharedArrayBuffer !== 'function') {
            return 'disabled';
          }
          return origGetItem.apply(this, arguments);
        };
        localStorage.removeItem('ejs_threads');
      } catch (_) {}

      const injectVimmStyles = () => {
        try {
          if (document.getElementById('xp-vimm-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-vimm-style';
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
            main.mainContent > div.centered > div:not(#game):not(.ejs_parent) {
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
            #game, .ejs_parent, .ejs_small_screen, .ejs_big_screen {
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

    // Auto-isolate & auto-start RetroGames.cz game frames inside Windows XP Simulator
    if (window.location.hostname.includes('retrogames.cz')) {
      try {
        window.EJS_startOnLoaded = true;
      } catch (_) {}

      // Keep document visibility active so EmulatorJS does not pause canvas rendering frames
      try {
        Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
      } catch (_) {}

      window.addEventListener('visibilitychange', (e) => {
        try { e.stopImmediatePropagation(); } catch (_) {}
      }, true);

      const injectRetroStyles = () => {
        try {
          if (document.getElementById('xp-retro-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-retro-style';
          style.textContent = `
            *, *::before, *::after { box-sizing: border-box; }
            html, body {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              overflow: hidden !important; background: #000 !important;
            }
            .adsbygoogle, #adblock-content, #preview_div, #fb-root, [id*="sharethis"], [class*="ad-"], div[style*="position: fixed"]:not(#game):not(#dosbox) {
              display: none !important; pointer-events: none !important; visibility: hidden !important;
            }
            #game, #dosbox, #my-div, #my-iframe, #start-screen {
              position: fixed !important; top: 0 !important; left: 0 !important;
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; max-height: none !important;
              margin: 0 !important; padding: 0 !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              z-index: 999999 !important; background: #000 !important; visibility: visible !important;
            }
            #game > *, #dosbox > *, #my-div > *, .ejs_parent, .ejs_small_screen, .ejs_big_screen, .dosbox-container {
              width: 100% !important; height: 100% !important;
              max-width: 100% !important; max-height: 100% !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              background: #000 !important; visibility: visible !important;
            }
            #game canvas, #dosbox canvas, .dosbox-canvas, canvas {
              width: 100% !important; height: 100% !important;
              max-width: 100% !important; max-height: 100% !important;
              object-fit: contain !important; image-rendering: pixelated !important;
              display: block !important; visibility: visible !important;
            }
            .ejs_start_button, .ejs_play_button, .dosbox-start, .dosbox-start a {
              position: absolute !important; top: 50% !important; left: 50% !important;
              transform: translate(-50%, -50%) !important; z-index: 9999999 !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              padding: 18px 36px !important; font-size: 24px !important; font-weight: bold !important;
              color: #fff !important; background: #1aafff !important; border-radius: 8px !important;
              box-shadow: 0 0 20px rgba(26, 175, 255, 0.6) !important; cursor: pointer !important;
              visibility: visible !important; opacity: 1 !important; pointer-events: auto !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };

      injectRetroStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectRetroStyles);
      }

      function tryClickRetroStart() {
        var btn = document.querySelector('.ejs_start_button, .ejs_play_button, .dosbox-start a, .dosbox-start, #dosbox canvas, #game canvas');
        if (btn) {
          setTimeout(function() {
            try { btn.click(); } catch (_) {}
            setTimeout(function() {
              try { window.dispatchEvent(new Event('resize')); } catch (_) {}
            }, 300);
          }, 400);
        } else {
          setTimeout(tryClickRetroStart, 200);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryClickRetroStart);
      } else {
        tryClickRetroStart();
      }

      setTimeout(() => { try { window.dispatchEvent(new Event('resize')); } catch (_) {} }, 1000);
      setTimeout(() => { try { window.dispatchEvent(new Event('resize')); } catch (_) {} }, 2500);
    }

    // Auto-unmute & fix audio on Super Mario Bros inside Windows XP Simulator
    if (window.location.hostname.includes('supermario-game.com')) {
      try {
        let _mute = false;
        Object.defineProperty(window, 'customMute', {
          get: () => false,
          set: () => { _mute = false; },
          configurable: true
        });
        window.smgVolume = 0.8;
        localStorage.setItem('muted', 'false');
      } catch (_) {}

      const unmuteMario = () => {
        try {
          window.customMute = false;
          window.smgVolume = 0.8;
          const paused = document.getElementById('paused');
          if (paused && paused.style.display !== 'none') {
            try { paused.click(); } catch (_) {}
          }
        } catch (_) {}
      };

      window.addEventListener('click', unmuteMario, { passive: true });
      window.addEventListener('keydown', unmuteMario, { passive: true });
      window.addEventListener('mousedown', unmuteMario, { passive: true });
      setInterval(unmuteMario, 1000);
    }

    // Auto-isolate & start FreePacman inside Windows XP Simulator
    if (window.location.hostname.includes('freepacman.org')) {
      const injectPacmanStyles = () => {
        try {
          if (document.getElementById('xp-pacman-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-pacman-style';
          style.textContent = `
            html, body {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              overflow: hidden !important; background: #000 !important;
            }
            #left-column, #menu1, #menu2, #menu-bottom, header, footer, [id*="inmobi"], [class*="ad"] {
              display: none !important; pointer-events: none !important;
            }
            main, #game-container {
              position: fixed !important; inset: 0 !important;
              width: 100vw !important; height: 100vh !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              background: #000 !important; z-index: 999999 !important;
            }
            #game-ui, canvas {
              max-width: 100vw !important; max-height: 100vh !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };

      injectPacmanStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPacmanStyles);
      }

      function tryStartPacman() {
        var startBtn = document.getElementById('game-start');
        if (startBtn) {
          setTimeout(function() { try { startBtn.click(); } catch (_) {} }, 300);
        } else {
          setTimeout(tryStartPacman, 200);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryStartPacman);
      } else {
        tryStartPacman();
      }
    }

    // Auto-isolate & hook dos.zone game frames (GTA III)
    if (window.location.hostname.includes('dos.zone')) {
      try {
        localStorage.setItem('tapp.launcher.torrentAllowed', 'false');
        localStorage.setItem('tapp.launcher.torrentRemindLater', String(Date.now()));
      } catch (_) {}

      // Intercept .torrent-launcher attributes to use direct S3 7z archive download (300MB vs stalled 920MB WebTorrent)
      const S3_GTA3_7Z = 'https://s3.ru1.storage.beget.cloud/68bbc47d0de7-doszone-archive/gta3-assets.7z';

      const patchLauncher = (el) => {
        if (!el || !el.setAttribute) return;
        const tid = el.getAttribute('data-torrent-id');
        if (!tid || tid === 'gta3-assets' || window.location.pathname.includes('regta3')) {
          el.setAttribute('data-torrent-7z', S3_GTA3_7Z);
          el.setAttribute('data-torrent-7z-delay', '0');
        }
      };

      try {
        const origGetAttr = Element.prototype.getAttribute;
        Element.prototype.getAttribute = function(name) {
          if (this && this.classList && this.classList.contains('torrent-launcher')) {
            const tid = origGetAttr.call(this, 'data-torrent-id');
            if (!tid || tid === 'gta3-assets' || window.location.pathname.includes('regta3')) {
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
            const targetSrc = (launcher && launcher.getAttribute('data-iframe-src')) || 'https://dos.zone/regta3/v3/index.html';
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

    // Auto-launch Half-Life (Xash3D Web) directly without manual clicks
    if (window.location.hostname.includes('pixelsuft.github.io')) {
      let started = false;
      const tryStartHL = () => {
        if (started) return;
        const btn = document.querySelector('input[value*="Launch Xash3D"]');
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

    // Auto-isolate & auto-start PES 6 (optijuegos.net)
    if (window.location.hostname.includes('optijuegos.net')) {
      const injectPes6Styles = () => {
        try {
          if (document.getElementById('xp-pes6-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-pes6-style';
          style.textContent = `
            html, body {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              overflow: hidden !important; background: #000 !important;
            }
            header, footer, aside, .settings-col, .btn-group, .compat-notice, section.player-col > :not(#stage) {
              display: none !important;
            }
            main.layout, section.player-col {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; display: flex !important;
              align-items: center !important; justify-content: center !important;
              background: #000 !important;
            }
            #stage.player {
              position: fixed !important; inset: 0 !important;
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; max-height: none !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              background: #000 !important; z-index: 99999 !important;
            }
            #stage canvas#canvas {
              width: 100% !important; height: 100% !important;
              max-width: 100% !important; max-height: 100% !important;
              object-fit: contain !important;
            }
            #stage #overlay {
              position: absolute !important; inset: 0 !important;
              z-index: 100000 !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };
      injectPes6Styles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPes6Styles);
      }

      let pes6Started = false;
      const tryStartPes6 = () => {
        if (pes6Started) return;
        const choice = document.getElementById('startChoice');
        const overlay = document.getElementById('overlay');
        const btn = document.getElementById('startWithCommentary') ||
                    document.querySelector('#startChoice button[data-commentary]') ||
                    document.getElementById('startWithoutCommentary');
        if (btn && (choice && !choice.hidden || (overlay && overlay.classList.contains('ready')) || document.querySelector('.start-choice:not([hidden])'))) {
          pes6Started = true;
          try { btn.click(); } catch (_) {}
        }
      };
      setInterval(tryStartPes6, 250);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryStartPes6);
      } else {
        tryStartPes6();
      }
    }

    // Auto-scale & isolate Flash / Ruffle games on ooooooooo.ooo (Tropix)
    if (window.location.hostname.includes('ooooooooo.ooo')) {
      const injectOoooStyles = () => {
        try {
          if (document.getElementById('xp-oooo-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-oooo-style';
          style.textContent = `
            html, body {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              overflow: hidden !important; background: #000 !important;
            }
            body > header, body > footer, .content > :not(.player-container), .info-container, .links-container, .message {
              display: none !important;
            }
            .content {
              margin: 0 !important; padding: 0 !important;
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; display: flex !important;
              align-items: center !important; justify-content: center !important;
              background: #000 !important;
            }
            .player-container {
              width: 100vw !important; height: 100vh !important;
              max-width: 100vw !important; max-height: 100vh !important;
              position: fixed !important; inset: 0 !important;
              margin: 0 !important; padding: 0 !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              background: #000 !important; z-index: 99999 !important;
            }
            ruffle-player, .player, canvas {
              width: 100% !important; height: 100% !important;
              max-width: 100% !important; max-height: 100% !important;
              position: absolute !important; inset: 0 !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };
      injectOoooStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectOoooStyles);
      }

      const enforcePlayerSize = () => {
        try {
          const container = document.querySelector('.player-container');
          if (container) {
            container.style.maxWidth = '100vw';
            container.style.maxHeight = '100vh';
            container.style.width = '100vw';
            container.style.height = '100vh';
          }
          const player = document.querySelector('ruffle-player') || document.querySelector('.player');
          if (player) {
            player.style.maxWidth = '100vw';
            player.style.maxHeight = '100vh';
            player.style.width = '100vw';
            player.style.height = '100vh';
          }
        } catch (_) {}
      };
      setInterval(enforcePlayerSize, 300);
    }

    // Auto-isolate & auto-start retrogames.cz game frames (Alone in the Dark)
    if (window.location.hostname.includes('retrogames.cz')) {
      // Stub Google AdSense to prevent "TagError: No slot size for availableWidth=0"
      try {
        window.adsbygoogle = {
          push: function() { return 0; },
          loaded: true
        };
      } catch (_) {}

      const injectRetrogamesStyles = () => {
        try {
          if (document.getElementById('xp-retrogames-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-retrogames-style';
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

  // Spoof top, parent, and frameElement so YouTube acts as a standalone browser window ONLY on YouTube!
  const isYouTube = window.location.hostname.includes('youtube.com') || window.location.hostname.includes('googlevideo.com');
  if (isYouTube) {
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
  }

  // Spoof document.referrer to YouTube origin ONLY on YouTube frames so player tokens remain valid
  if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('googlevideo.com')) {
    try {
      Object.defineProperty(document, 'referrer', {
        get: () => 'https://www.youtube.com/',
        configurable: true
      });
    } catch (e) {}
  }

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

