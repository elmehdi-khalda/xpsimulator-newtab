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
      const initMode = document.documentElement.getAttribute('data-xp-theme-mode') || 'light';
      document.documentElement.style.setProperty('color-scheme', initMode, 'important');
      try {
        const themeObserver = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'data-xp-theme-mode') {
              const currentMode = document.documentElement.getAttribute('data-xp-theme-mode') || 'light';
              document.documentElement.style.setProperty('color-scheme', currentMode, 'important');
            }
          }
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-xp-theme-mode'] });
      } catch (_) {}
    }

    const host = (window.location.hostname || '').toLowerCase();
    const isGoogleOrYoutube = (
      host === 'google.com' ||
      host.endsWith('.google.com') ||
      host.includes('google.') ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host.includes('youtube.') ||
      host.includes('googlevideo.') ||
      host.includes('ytimg.') ||
      host.endsWith('youtu.be')
    );

    // Dynamic 10.56 enhancements for general external subframes (skipped for Google & YouTube to restore 2-weeks-ago native behavior)
    if (!isGoogleOrYoutube) {
      // Ensure navigator.cookieEnabled reports true and document.cookie works in subframes
      try {
        if (Object.getOwnPropertyDescriptor(Navigator.prototype, 'cookieEnabled')) {
          Object.defineProperty(Navigator.prototype, 'cookieEnabled', {
            get: () => true,
            configurable: true
          });
        }
        if (typeof document.hasStorageAccess === 'function') {
          document.hasStorageAccess = async function() { return true; };
        }
        if (typeof document.requestStorageAccess === 'function') {
          document.requestStorageAccess = async function() { return true; };
        }
      } catch (_) {}

      // Support SameSite=None; Secure for document.cookie in iframe context
      try {
        const origCookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                               Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
        if (origCookieDesc && origCookieDesc.set) {
          Object.defineProperty(document, 'cookie', {
            get: function() {
              return origCookieDesc.get.call(this);
            },
            set: function(val) {
              if (typeof val === 'string' && !val.toLowerCase().includes('samesite')) {
                val += '; SameSite=None; Secure';
              }
              return origCookieDesc.set.call(this, val);
            },
            configurable: true
          });
        }
      } catch (_) {}

      // Ensure crossOriginIsolated is reported as true, but ONLY on runtime/engine pages that are
      // truly cross-origin isolated (have COEP), not on shell/landing pages that use deferredIsolation.
      // Shell pages like residentevil4.online, fifastreet.online etc. check crossOriginIsolated and
      // if false they redirect #game-frame to ?play=1 (or /runtime/) which IS truly isolated.
      // Polyfilling true on shell pages breaks that redirect, so the game tries to boot in a non-isolated
      // context and SharedArrayBuffer worker.postMessage fails.
      // We DO polyfill on ?play=1 pages and /runtime/ pages (where isolation is enforced via
      // Document-Isolation-Policy injected by the DNR rule).
      try {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const isRuntimePage = pathname.startsWith('/runtime') || pathname.startsWith('/legacy-runtime');
        const isPlayPage = searchParams.get('play') === '1';
        // isShellGame = the bare shell page (no ?play=1, not a runtime page) on .online/.fun/.lol
        const isShellGame = (
          hostname.endsWith('.online') || hostname.endsWith('.fun') || hostname.endsWith('.lol')
        ) && !isRuntimePage && !isPlayPage;
        // Polyfill ONLY when NOT on a bare shell page (skip so deferredIsolation redirects to ?play=1)
        if (!window.crossOriginIsolated && !isShellGame) {
          Object.defineProperty(window, 'crossOriginIsolated', {
            value: true,
            configurable: true,
            writable: true
          });
        }
      } catch (_) {}
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

    // Forward ESC key press from subframe to parent XP Simulator window for fullscreen handling
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'xp-exit-fullscreen' }, '*');
          }
        } catch (_) {}
      }
    }, { capture: true, passive: true });

    // Ensure nested game iframes (such as #game-frame in residentevil4.online, pes12.online, etc.)
    // have the 'credentialless' attribute and 'cross-origin-isolated' permission before navigating.
    // This allows Chromium to isolate the subframe and permits SharedArrayBuffer transfer to Workers.
    // STRICT GUARD: NEVER apply credentialless to Google, YouTube, or general user-authenticated sites,
    // as credentialless strips user cookies and partitions authentication sessions!
    try {
      const isProtectedOrigin = () => {
        try {
          const h = (window.location.hostname || '').toLowerCase();
          return (
            h.includes('google.') ||
            h.includes('youtube.') ||
            h.includes('gstatic.') ||
            h.includes('googleusercontent.') ||
            h.includes('googleapis.') ||
            h.includes('googlevideo.') ||
            h.includes('ytimg.') ||
            h.includes('bing.com') ||
            h.includes('yahoo.com') ||
            h.includes('reddit.com') ||
            h.includes('twitter.com') ||
            h.includes('x.com') ||
            h.includes('facebook.com')
          );
        } catch (_) {
          return false;
        }
      };

      if (!isProtectedOrigin()) {
        const isGameIframe = (iframe) => {
          if (!iframe) return false;
          try {
            const id = (iframe.id || '').toLowerCase();
            const cls = (iframe.className || '').toLowerCase();
            const src = (iframe.getAttribute('src') || iframe.src || '').toLowerCase();
            if (
              src.includes('google.') ||
              src.includes('youtube.') ||
              src.includes('accounts.google.') ||
              src.includes('gstatic.')
            ) {
              return false; // NEVER treat Google / YouTube as game iframe
            }
            const h = (window.location.hostname || '').toLowerCase();
            return (
              id.includes('game') ||
              cls.includes('game') ||
              h.endsWith('.online') ||
              h.endsWith('.lol') ||
              h.endsWith('.fun') ||
              h.includes('wasmarcade') ||
              h.includes('exebrowser') ||
              h.includes('vel.gg') ||
              h.includes('itch.io') ||
              src.includes('.online') ||
              src.includes('.lol') ||
              src.includes('.fun') ||
              src.includes('exebrowser')
            );
          } catch (_) {
            return false;
          }
        };

        const ensureIframeIsolation = (iframe) => {
          if (!iframe || !(iframe instanceof HTMLIFrameElement || iframe.tagName === 'IFRAME')) return;
          if (!isGameIframe(iframe)) return;
          try {
            if (!iframe.hasAttribute('credentialless')) {
              iframe.setAttribute('credentialless', '');
            }
            const allow = iframe.getAttribute('allow') || '';
            if (!allow.includes('cross-origin-isolated')) {
              iframe.setAttribute('allow', (allow ? allow + '; ' : '') + 'cross-origin-isolated *; autoplay *; fullscreen *; gamepad *');
            }
          } catch (_) {}
        };

        // 1. Intercept iframe.src property setter
        const iframeProto = HTMLIFrameElement.prototype;
        const srcDescriptor = Object.getOwnPropertyDescriptor(iframeProto, 'src');
        if (srcDescriptor && srcDescriptor.set) {
          const origSrcSet = srcDescriptor.set;
          Object.defineProperty(iframeProto, 'src', {
            set: function(val) {
              ensureIframeIsolation(this);
              return origSrcSet.call(this, val);
            },
            get: srcDescriptor.get,
            configurable: true,
            enumerable: true
          });
        }

        // 2. Intercept Element.prototype.setAttribute for src
        const origSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, val) {
          if (this instanceof HTMLIFrameElement && typeof name === 'string' && name.toLowerCase() === 'src') {
            ensureIframeIsolation(this);
          }
          return origSetAttribute.call(this, name, val);
        };

        // 3. Intercept Document.prototype.createElement for iframes
        const origCreateElement = Document.prototype.createElement;
        Document.prototype.createElement = function(tagName, options) {
          const el = origCreateElement.call(this, tagName, options);
          if (typeof tagName === 'string' && tagName.toLowerCase() === 'iframe') {
            ensureIframeIsolation(el);
          }
          return el;
        };

        // 4. Scan existing and observe DOM
        const scanIframes = () => {
          document.querySelectorAll('iframe').forEach(ensureIframeIsolation);
        };
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', scanIframes, { once: true });
        } else {
          scanIframes();
        }

        if (document.documentElement) {
          const iframeObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
              for (const node of m.addedNodes) {
                if (node.tagName === 'IFRAME') {
                  ensureIframeIsolation(node);
                } else if (node.querySelectorAll) {
                  node.querySelectorAll('iframe').forEach(ensureIframeIsolation);
                }
              }
            }
          });
          iframeObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
      }
    } catch (_) {}

    // Auto-skip landing splash screen on web games / emulators (fifa14.online, pes12.online, residentevil4.online, fiveplay.lol, etc.)
    try {
      let launchDone = false; // guard: only fire once per page load

      const tryClickLaunchButton = () => {
        if (launchDone) return false;
        const btn = document.querySelector('#start-panel #solo, #start-panel button.primary, button#solo, #solo, button#start, .start#start');
        if (btn && !btn.disabled && !btn.__xp_auto_clicked) {
          launchDone = true;
          btn.__xp_auto_clicked = true;
          try {
            btn.click(); // single click only — avoids double boot() race
          } catch (_) {}
          const startPanel = document.getElementById('start-panel');
          if (startPanel) {
            startPanel.style.setProperty('display', 'none', 'important');
          }
          return true;
        }
        return false;
      };

      // Poll periodically (every 200ms up to 30s) so when the WebAssembly runtime finishes downloading and enables the button, it triggers instantly
      let attempts = 150;
      const launchPoll = setInterval(() => {
        attempts--;
        if (tryClickLaunchButton() || attempts <= 0) {
          clearInterval(launchPoll);
        }
      }, 200);

      let attrObsRef = null;
      const setupLaunchObserver = () => {
        if (launchDone) return;
        const btn = document.querySelector('#start-panel #solo, #start-panel button.primary, button#solo, #solo, button#start, .start#start');
        if (btn) {
          if (!btn.disabled) {
            tryClickLaunchButton();
          } else if (!btn.__xp_obs_attached) {
            btn.__xp_obs_attached = true; // prevent multiple attrObs on same button
            const attrObs = new MutationObserver(() => {
              if (!btn.disabled) {
                tryClickLaunchButton();
                attrObs.disconnect();
              }
            });
            attrObsRef = attrObs;
            attrObs.observe(btn, { attributes: true, attributeFilter: ['disabled'] });
            setTimeout(() => attrObs.disconnect(), 30000);
          }
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLaunchObserver, { once: true });
      } else {
        setupLaunchObserver();
      }

      const landingObserver = new MutationObserver(() => {
        if (launchDone) { landingObserver.disconnect(); return; }
        setupLaunchObserver();
      });
      if (document.documentElement) {
        landingObserver.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => landingObserver.disconnect(), 30000);
      }
    } catch (_) {}

    // Style viewport-filling canvas & isolate game iframe for embedded games (e.g. wasmarcade.com, fifastreet.online, pes12.online, emulators)
    try {
      if (window.self !== window.top) {
        const applyGameViewportFix = () => {
          const host = (window.location.hostname || '').toLowerCase();
          // STRICT EXCLUSION: Never apply game viewport CSS to YouTube, Google, Bing, Wikipedia, or other standard websites!
          if (
            host.includes('youtube.com') ||
            host.includes('googlevideo.com') ||
            host.includes('ytimg.com') ||
            host.includes('google.') ||
            host.includes('gstatic.com') ||
            host.includes('bing.com') ||
            host.includes('yahoo.com') ||
            host.includes('wikipedia.org') ||
            host.includes('reddit.com') ||
            host.includes('github.com') ||
            host.includes('x.com') ||
            host.includes('twitter.com') ||
            host.includes('facebook.com')
          ) {
            return;
          }

          const hasGame = document.querySelector('canvas#canvas, #canvas, canvas.emscripten, #game-frame, .screen, #stage, .player, #player');
          if (hasGame) {
            let style = document.getElementById('xp-game-viewport-fix');
            if (!style) {
              style = document.createElement('style');
              style.id = 'xp-game-viewport-fix';
              style.textContent = `
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: hidden !important;
                  width: 100vw !important;
                  height: 100vh !important;
                  background: #000 !important;
                }
                /* Make the main layout fill viewport and hide overflow */
                main.layout, main, body > main {
                  display: block !important;
                  width: 100vw !important;
                  height: 100vh !important;
                  max-width: 100vw !important;
                  max-height: 100vh !important;
                  overflow: hidden !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                /* Isolate game screen/frame/canvas to 100% full viewport */
                .screen, #game-frame, #stage, .player, #player, #canvas-container, #player-container, .player-column, section.player-column {
                  position: fixed !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 100vw !important;
                  height: 100vh !important;
                  max-width: 100vw !important;
                  max-height: 100vh !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  z-index: 999999 !important;
                  background: #000 !important;
                }
                canvas#canvas, canvas.emscripten, .screen iframe, #game-frame, .screen canvas, #stage canvas, .player canvas {
                  width: 100% !important;
                  height: 100% !important;
                  max-width: 100vw !important;
                  max-height: 100vh !important;
                  display: block !important;
                  margin: auto !important;
                  border: none !important;
                  object-fit: contain !important;
                }
                /* Hide website headers, sidebars, footers and advertisements */
                header, footer, aside, .sidebar-column, .sidebar, #sidebar, #top-bar, .player-actions, .player-status, .gamepad-hint, #ad-banner-slot-wrap, #loading-ad, .loading-ad, .ad-label, #ad-loading-slot, .ad-slot, [aria-label*="Publicidad"], [aria-label*="Advertisement"], .ad-rail, .leaderboard-rail, .promo-card, .seo-about, .footer-contact, .footer-bottom, .dialog-heading, .chat-frame, #chatFrame, .brand, .tabs, .modal-footer, .settings-panel, section.promo-card, section.promo-card-catalog {
                  display: none !important;
                }
              `;
              (document.head || document.documentElement).appendChild(style);
            }
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyGameViewportFix, { once: true });
        } else {
          applyGameViewportFix();
        }

        // Re-evaluate when dynamic game elements attach
        const vpObserver = new MutationObserver(() => applyGameViewportFix());
        if (document.documentElement) {
          vpObserver.observe(document.documentElement, { childList: true, subtree: true });
          setTimeout(() => vpObserver.disconnect(), 15000);
        }
      }
    } catch (_) {}

    // Filter harmless warnings in console
    try {
      const origConsoleWarn = console.warn;
      console.warn = function(...args) {
        if (typeof args[0] === 'string') {
          if (args[0].includes('Unhandled egui viewport command: Title')) {
            const match = args[0].match(/Title\("([^"]+)"\)/);
            if (match && match[1]) {
              try { document.title = match[1]; } catch (_) {}
            }
            return; // Suppress continuous console spam in animation loop
          }
          if (args[0].includes('cdn.tailwindcss.com should not be used in production')) {
            return;
          }
          if (args[0].includes("Couldn't load Ruffle into IFRAME") && args[0].includes('data:text/html')) {
            return;
          }
        }
        return origConsoleWarn.apply(console, args);
      };
    } catch (_) {}

    // Ensure dynamically clicked anchor elements with download attribute in subframes route to XP simulator filesystem
    try {
      const origAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download && this.href && window.self !== window.top) {
          const downloadName = this.download || 'download';
          const hrefUrl = this.href;
          try {
            fetch(hrefUrl)
              .then(res => res.arrayBuffer())
              .then(buf => {
                window.parent.postMessage({
                  type: 'xp_sim_request_save_file',
                  name: downloadName,
                  suggestedName: downloadName,
                  buffer: buf,
                  bytes: buf,
                  mimeType: 'application/octet-stream'
                }, '*');
              })
              .catch(() => {
                origAnchorClick.apply(this, arguments);
              });
            return;
          } catch (_) {
            return origAnchorClick.apply(this, arguments);
          }
        }
        if (this.download && this.href) {
          if (!document.documentElement.contains(this)) {
            (document.body || document.documentElement).appendChild(this);
            setTimeout(() => { try { this.remove(); } catch (_) {} }, 2000);
          }
        }
        return origAnchorClick.apply(this, arguments);
      };
    } catch (_) {}

    // Forward requestFullscreen from subframes to native XP window fullscreen
    try {
      const origReqFullscreen = Element.prototype.requestFullscreen;
      Element.prototype.requestFullscreen = function() {
        if (window.self !== window.top) {
          window.parent.postMessage({ type: 'xp-toggle-fullscreen' }, '*');
          return Promise.resolve();
        }
        return origReqFullscreen.apply(this, arguments);
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

    // Polyfill / safe-guard showOpenFilePicker for cross-origin subframes to use XP Simulator file modal
    try {
      if (typeof window.showOpenFilePicker === 'function' || window.self !== window.top) {
        const origShowOpenFilePicker = window.showOpenFilePicker;
        window.showOpenFilePicker = async function(options) {
          if (window.self !== window.top) {
            return new Promise((resolve, reject) => {
              const reqId = 'req_' + Math.random().toString(36).substring(2);
              const handler = (evt) => {
                if (evt.data && evt.data.type === 'xp_sim_open_file_response' && evt.data.requestId === reqId) {
                  window.removeEventListener('message', handler);
                  if (evt.data.cancelled || !evt.data.files || evt.data.files.length === 0) {
                    reject(new DOMException('The user aborted a request.', 'AbortError'));
                    return;
                  }
                  const handles = evt.data.files.map(item => {
                    const f = new File([item.buffer], item.name, { type: item.type, lastModified: item.lastModified });
                    return {
                      kind: 'file',
                      name: item.name,
                      getFile: async () => f,
                      createWritable: async () => ({
                        async write(data) {},
                        async close() {}
                      })
                    };
                  });
                  resolve(options && options.multiple ? handles : (handles[0] ? [handles[0]] : handles));
                }
              };
              window.addEventListener('message', handler);
              window.parent.postMessage({
                type: 'xp_sim_request_open_file',
                requestId: reqId,
                multiple: !!(options && options.multiple),
                desc: (options && options.types && options.types[0]?.description) || 'Supported Files'
              }, '*');
            });
          }
          if (typeof origShowOpenFilePicker === 'function') {
            return await origShowOpenFilePicker.call(window, options);
          }
        };
      }
    } catch (_) {}

    // Hook HTMLInputElement click to redirect file open inputs to simulated XP dialog
    try {
      const origInputClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function() {
        if (this.type === 'file' && window.self !== window.top) {
          const reqId = 'req_' + Math.random().toString(36).substring(2);
          const inputEl = this;
          const handler = (evt) => {
            if (evt.data && evt.data.type === 'xp_sim_open_file_response' && evt.data.requestId === reqId) {
              window.removeEventListener('message', handler);
              if (!evt.data.cancelled && evt.data.files && evt.data.files.length > 0) {
                try {
                  const dt = new DataTransfer();
                  for (const f of evt.data.files) {
                    const fileObj = new File([f.buffer], f.name, { type: f.type, lastModified: f.lastModified });
                    dt.items.add(fileObj);
                  }
                  inputEl.files = dt.files;
                  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (_) {}
              }
            }
          };
          window.addEventListener('message', handler);
          window.parent.postMessage({
            type: 'xp_sim_request_open_file',
            requestId: reqId,
            multiple: this.multiple,
            desc: this.accept || 'All Files'
          }, '*');
          return;
        }
        return origInputClick.call(this);
      };
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
            } else if (fileName.endsWith('.psd')) {
              mimeType = 'image/vnd.adobe.photoshop';
            } else if (fileName.endsWith('.png')) {
              mimeType = 'image/png';
            } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
              mimeType = 'image/jpeg';
            } else if (fileName.endsWith('.webp')) {
              mimeType = 'image/webp';
            }
            const blob = new Blob(chunks, { type: mimeType });
            savedFile = new File([blob], fileName, { type: mimeType });

            if (window.parent && window.parent !== window) {
              try {
                const arrayBuf = await blob.arrayBuffer();
                window.parent.postMessage({
                  type: 'xp_sim_request_save_file',
                  name: fileName,
                  suggestedName: fileName,
                  mimeType: mimeType,
                  buffer: arrayBuf
                }, '*');
              } catch (_) {}
            }

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
            div#main, div.innerMain, div.innerMain > div, main.mainContent, div.centered, .centered {
              position: fixed !important; inset: 0 !important;
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; max-height: none !important;
              margin: 0 auto !important; padding: 0 !important;
              display: flex !important; flex-direction: column !important;
              align-items: center !important; justify-content: center !important;
              overflow: hidden !important; background: #000 !important;
              border: none !important; aspect-ratio: unset !important;
            }
            #game, .ejs_parent, .ejs_game, .ejs_canvas_parent, .ejs_game_background, .ejs_small_screen, .ejs_big_screen {
              width: 100vw !important; height: 100vh !important;
              max-width: none !important; max-height: none !important;
              margin: 0 auto !important; padding: 0 !important;
              display: flex !important; align-items: center !important; justify-content: center !important;
              position: relative !important;
            }
            .ejs_game_background {
              background-position: center center !important;
              background-size: contain !important;
              background-repeat: no-repeat !important;
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
            canvas, .ejs_canvas {
              image-rendering: pixelated !important;
              width: 100% !important; height: 100% !important;
              max-width: 100vw !important; max-height: 100vh !important;
              object-fit: contain !important; outline: none !important;
              margin: auto !important; display: block !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };

      const fixVimmDOM = () => {
        try {
          const elements = document.querySelectorAll('#main, .innerMain, .innerMain > div, .mainContent, .centered, #game, .ejs_parent, .ejs_game, .ejs_canvas_parent');
          elements.forEach(el => {
            el.style.setProperty('max-width', 'none', 'important');
            el.style.setProperty('max-height', 'none', 'important');
            el.style.setProperty('aspect-ratio', 'unset', 'important');
            el.style.setProperty('width', '100vw', 'important');
            el.style.setProperty('height', '100vh', 'important');
            el.style.setProperty('margin', '0 auto', 'important');
            el.style.setProperty('border', 'none', 'important');
          });
        } catch (_) {}
      };

      injectVimmStyles();
      fixVimmDOM();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          injectVimmStyles();
          fixVimmDOM();
        });
      }

      // Observer to ensure dynamic elements inserted by loader.js / emulator.js are unconstrained
      try {
        const obs = new MutationObserver(() => {
          fixVimmDOM();
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), 15000);
      } catch (_) {}

      var vimmStartAttempts = 0;
      function tryClickVimmStart() {
        fixVimmDOM();
        var btn = document.querySelector('.ejs_start_button');
        if (btn) {
          setTimeout(function() {
            try {
              btn.click();
              setTimeout(() => {
                fixVimmDOM();
                window.dispatchEvent(new Event('resize'));
              }, 400);
            } catch (_) {}
          }, 400);
        } else if (vimmStartAttempts++ < 50) {
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

    // Auto-isolate & screen-fit copy.sh v86 virtual machine frames (Remote Access Services)
    if (window.location.hostname.includes('copy.sh')) {
      const injectV86Styles = () => {
        try {
          if (document.getElementById('xp-v86-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-v86-style';
          style.textContent = `
            html, body {
              background: #000000 !important;
              color: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              overflow: hidden !important;
            }
            body > *:not(#screen_container),
            #boot_options,
            #runtime_options,
            #runtime_infos,
            #description,
            #links,
            #filesystem_panel,
            #terminal,
            #toggle_ui,
            #theatre_background,
            code,
            h1, h2, h3, h4, hr, footer, header {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
              height: 0 !important;
              width: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            #screen_container {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              position: fixed !important;
              inset: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #000000 !important;
              z-index: 999999 !important;
              overflow: hidden !important;
            }
            #vga {
              display: block !important;
              max-width: 100vw !important;
              max-height: 100vh !important;
              width: 100% !important;
              height: 100% !important;
              object-fit: contain !important;
              image-rendering: pixelated !important;
              image-rendering: crisp-edges !important;
              margin: auto !important;
            }
            #screen {
              max-width: 100vw !important;
              max-height: 100vh !important;
              margin: auto !important;
              font-family: monospace !important;
            }
            #loading {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              color: #ffffff !important;
              background: rgba(0, 0, 0, 0.85) !important;
              padding: 12px 24px !important;
              border-radius: 6px !important;
              font-family: monospace !important;
              font-size: 14px !important;
              z-index: 1000000 !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };
      injectV86Styles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectV86Styles);
      }
      window.addEventListener('load', injectV86Styles);
      const v86Timer = setInterval(injectV86Styles, 500);
      setTimeout(() => clearInterval(v86Timer), 10000);
    }

    // Auto-isolate & screen-fit pcjs.org historic machines (Remote Access Services)
    if (window.location.hostname.includes('pcjs.org')) {
      const injectPcjsStyles = () => {
        try {
          if (document.getElementById('xp-pcjs-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-pcjs-style';
          style.textContent = `
            html, body {
              background: #000000 !important;
              color: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              overflow: hidden !important;
            }
            header, footer, .menu, #pcjs-machines, #pcjs-heading,
            .pcjs-name, .pcjs-title, .pcjs-copyright, .pcjs-reference,
            .pcjs-controls, .pcjs-control, .pcjs-button, .pcjs-status,
            .pcjs-description, .pcjs-registers, .pcjs-panel, .pcjs-fieldset,
            .machine-warning, .language-plaintext, .highlight, .pcjs-explorer,
            h1, h2, h3, h4, hr, p {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            .wrapper, section {
              position: fixed !important;
              inset: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              background: #000000 !important;
              overflow: hidden !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              z-index: 10 !important;
            }
            .machine-placeholder, .pcjs-machine, .pcjs-chassis, .pcjs-video, .pcjs-monitor, .pcjs-surface {
              position: relative !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              background: #000000 !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              max-width: 100vw !important;
              max-height: 100vh !important;
            }
            .pcjs-screen {
              margin: auto !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              max-width: 100vw !important;
              max-height: 100vh !important;
              background: #000000 !important;
            }
            canvas.pcjs-canvas {
              display: block !important;
              max-width: 100vw !important;
              max-height: 100vh !important;
              width: auto !important;
              height: auto !important;
              object-fit: contain !important;
              image-rendering: pixelated !important;
              image-rendering: crisp-edges !important;
              margin: auto !important;
            }
            textarea.pcjs-overlay {
              position: absolute !important;
              inset: 0 !important;
              max-width: 100vw !important;
              max-height: 100vh !important;
              margin: auto !important;
              opacity: 0 !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };
      injectPcjsStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPcjsStyles);
      }
    }

    // Auto-fit distrosea.com live linux distros (Remote Access Services)
    if (window.location.hostname.includes('distrosea.com')) {
      const injectDistroSeaStyles = () => {
        try {
          if (document.getElementById('xp-distrosea-style')) return;
          const style = document.createElement('style');
          style.id = 'xp-distrosea-style';
          style.textContent = `
            html, body {
              background: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              overflow: auto !important;
            }
            header, footer, nav, #info, .supporter-avatar, [data-v-c05018cf], #ad-container, .adsbygoogle {
              display: none !important;
            }
            iframe, #vnc, #display, canvas {
              max-width: 100vw !important;
              max-height: 100vh !important;
            }
          `;
          (document.head || document.documentElement).appendChild(style);
        } catch (_) {}
      };
      injectDistroSeaStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectDistroSeaStyles);
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

  // Fix cross-subdomain postMessage targetOrigin mismatches (skip Google & YouTube to preserve native OAuth/GIS token exchanges)
  try {
    const originalPostMessage = window.postMessage;
    const currentHost = (window.location.hostname || '').toLowerCase();
    const isGoogleOrYoutubeForPM = (
      currentHost === 'google.com' ||
      currentHost.endsWith('.google.com') ||
      currentHost.includes('google.') ||
      currentHost === 'youtube.com' ||
      currentHost.endsWith('.youtube.com') ||
      currentHost.includes('youtube.') ||
      currentHost.includes('googlevideo.') ||
      currentHost.includes('ytimg.') ||
      currentHost.endsWith('youtu.be')
    );
    if (!isGoogleOrYoutubeForPM) {
      window.postMessage = function(message, targetOrigin, transfer) {
        if (location.hostname.includes('cloudflare') || location.hostname.includes('turnstile') || (message && typeof message === 'object' && ('turnstile' in message || 'source' in message || 'chlPage' in message))) {
          return originalPostMessage.apply(this, arguments);
        }
        if (!targetOrigin || targetOrigin === 'undefined' || (typeof targetOrigin === 'string' && targetOrigin !== '*' && !targetOrigin.startsWith('/'))) {
          targetOrigin = '*';
        }
        try {
          return originalPostMessage.call(this, message, targetOrigin, transfer);
        } catch (e) {
          return originalPostMessage.call(this, message, '*', transfer);
        }
      };
    }
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

