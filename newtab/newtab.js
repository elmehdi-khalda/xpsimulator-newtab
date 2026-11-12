/**
 * Windows XP Simulator - New Tab Page Handler
 * Clean simulator landing page with optional Full Simulation mode.
 */

const DEFAULT_SIMULATOR_URL = 'https://xpsimulator.com';

const iframe = document.getElementById('simulator-iframe');
const offlineScreen = document.getElementById('offline-screen');
const offlineTargetUrl = document.getElementById('offline-target-url');
const btnRetryConnect = document.getElementById('btn-retry-connect');
const btnDialogClose = document.getElementById('btn-dialog-close');
const btnResetUrl = document.getElementById('btn-reset-url');
let currentSimulatorUrl = DEFAULT_SIMULATOR_URL;
let isFullSimulationEnabled = false;

async function init() {
  try {
    const data = await chrome.storage.local.get(['simulatorUrl', 'fullSimulation']);
    let url = data.simulatorUrl;
    
    // Auto-heal corrupted URL
    if (!url || url.includes('vercel.app') || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      url = DEFAULT_SIMULATOR_URL;
      chrome.storage.local.set({ simulatorUrl: DEFAULT_SIMULATOR_URL });
    }
    currentSimulatorUrl = url;
    isFullSimulationEnabled = !!data.fullSimulation;
  } catch (e) {
    console.warn('Could not read from chrome.storage:', e);
    currentSimulatorUrl = DEFAULT_SIMULATOR_URL;
    isFullSimulationEnabled = false;
  }

  offlineTargetUrl.textContent = currentSimulatorUrl;
  loadSimulator(currentSimulatorUrl);
  setupFullscreenListener();
  setupOfflineListeners();
  applyFullSimulationMode();

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.fullSimulation !== undefined) {
        isFullSimulationEnabled = !!changes.fullSimulation.newValue;
        applyFullSimulationMode();
      }
      if (changes.simulatorUrl && changes.simulatorUrl.newValue !== currentSimulatorUrl) {
        currentSimulatorUrl = changes.simulatorUrl.newValue;
        offlineTargetUrl.textContent = currentSimulatorUrl;
        loadSimulator(currentSimulatorUrl);
      }
    }
  });
}

async function loadSimulator(url) {
  offlineScreen.classList.add('hidden');
  iframe.src = url;

  let loaded = false;
  iframe.onload = () => {
    loaded = true;
    offlineScreen.classList.add('hidden');
  };

  // Background prewarm/cache for fast subsequent sessions
  preloadSimulatorAssets(url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    await fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timeoutId);
    offlineScreen.classList.add('hidden');
  } catch (err) {
    // Only show offline dialog if actually offline and iframe failed to load
    setTimeout(() => {
      if (loaded) return;
      if (!navigator.onLine) {
        offlineScreen.classList.remove('hidden');
        return;
      }
      try {
        if (iframe && iframe.contentWindow && iframe.contentWindow.location.href === 'about:blank') {
          offlineScreen.classList.remove('hidden');
        }
      } catch (e) {
        // Cross-origin access exception means iframe has navigated to the simulator domain!
        offlineScreen.classList.add('hidden');
      }
    }, 12000);
  }
}

async function preloadSimulatorAssets(url) {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'force-cache' }).catch(() => null);
    if (!res || !res.ok) return;
    const html = await res.text();
    const assetMatches = html.match(/(?:src|href)=["']([^"']+\.(?:js|css|png|jpg|mp3))["']/g) || [];
    const base = new URL(url);
    const assetUrls = assetMatches.map(m => {
      const p = m.replace(/^(?:src|href)=["']|["']$/g, '');
      return new URL(p, base).toString();
    });
    Promise.allSettled(assetUrls.slice(0, 40).map(u => fetch(u, { mode: 'no-cors', cache: 'force-cache' }))).catch(() => {});
  } catch(e) {}
}

function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
    (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) ||
    (window.innerHeight >= screen.height - 4 && window.innerWidth >= screen.width - 4)
  );
}

function applyFullSimulationMode() {
  if (isFullSimulationEnabled && !isFullscreenActive()) {
    const onFirstInteraction = () => {
      if (isFullSimulationEnabled && !isFullscreenActive()) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', onFirstInteraction, { once: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true });
  }
}

function setupFullscreenListener() {
  window.addEventListener('message', (e) => {
    if (e.data) {
      offlineScreen.classList.add('hidden');
    }
    if (e.data && e.data.type === 'IE_FRAME_NAVIGATED') {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(e.data, '*');
      }
    }
    if (e.data && e.data.type === 'XP_DESKTOP_CACHE_SYNC' && e.data.data) {
      chrome.storage.local.set({ cachedDesktop: e.data.data });
      const instantWallpaper = document.getElementById('instant-wallpaper');
      if (instantWallpaper && e.data.data.wallpaper) {
        instantWallpaper.style.backgroundImage = `url("${e.data.data.wallpaper}")`;
      }
      chrome.runtime.sendMessage({ action: 'XP_DESKTOP_CACHE_SYNC', data: e.data.data }).catch(() => {});
    }
    if (e.data && e.data.type === 'XP_NAVIGATE_TAB' && e.data.url) {
      window.location.href = e.data.url;
    }
    if (e.data && e.data.type === 'TOGGLE_FULLSCREEN') {
      toggleFullscreen();
    }
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function setupOfflineListeners() {
  btnRetryConnect?.addEventListener('click', () => {
    loadSimulator(currentSimulatorUrl);
  });

  btnResetUrl?.addEventListener('click', () => {
    currentSimulatorUrl = DEFAULT_SIMULATOR_URL;
    chrome.storage.local.set({ simulatorUrl: DEFAULT_SIMULATOR_URL });
    offlineTargetUrl.textContent = DEFAULT_SIMULATOR_URL;
    loadSimulator(DEFAULT_SIMULATOR_URL);
  });

  btnDialogClose?.addEventListener('click', () => {
    offlineScreen.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', init);