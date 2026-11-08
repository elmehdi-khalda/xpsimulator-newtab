const DEFAULT_SIMULATOR_URL = 'https://xpsimulator.vercel.app';

const switchOpenIe = document.getElementById('switch-open-ie');
const selectThemeMode = document.getElementById('select-theme-mode');
const btnImportBookmarks = document.getElementById('btn-import-bookmarks');
const bookmarkStatusMsg = document.getElementById('bookmark-status-msg');
const inputUrl = document.getElementById('input-simulator-url');
const btnSaveUrl = document.getElementById('btn-save-url');
const btnResetUrl = document.getElementById('btn-reset-url');
const statusMsg = document.getElementById('status-msg');

const checkOverlayMaster = document.getElementById('check-overlay-master');

// Load initial settings
function applyTheme(mode) {
  let isDark = false;
  if (mode === 'dark') {
    isDark = true;
  } else if (mode === 'system') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (document.documentElement) {
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.documentElement.setAttribute('data-xp-theme-mode', mode || 'light');
  }
  if (document.body) {
    document.body.classList.toggle('dark-mode', isDark);
  }
}

const checkOldGoogleReal = document.getElementById('check-old-google-real');
const checkOldYouTubeReal = document.getElementById('check-old-youtube-real');
const checkMemePack = document.getElementById('check-meme-pack');
const checkKeepWindows = document.getElementById('check-keep-windows');
const checkSingleClick = document.getElementById('check-single-click');
const sliderBrightness = document.getElementById('slider-brightness');
const brightnessValLabel = document.getElementById('brightness-val-label');


// Load initial settings
chrome.storage.local.get(['simulatorUrl', 'openInIE', 'themeMode', 'xpOverlaySettings', 'oldGoogleRealBrowser', 'oldYouTubeRealBrowser', 'enableMemePack', 'keepWindowsOpen', 'singleClickOpen', 'brightness'], (data) => {
  inputUrl.value = data.simulatorUrl || DEFAULT_SIMULATOR_URL;
  switchOpenIe.checked = data.openInIE !== false;
  const initialTheme = data.themeMode || 'light';
  if (selectThemeMode) {
    selectThemeMode.value = initialTheme;
  }
  applyTheme(initialTheme);

  const overlaySettings = data.xpOverlaySettings || { masterEnabled: true };
  if (checkOverlayMaster) checkOverlayMaster.checked = overlaySettings.masterEnabled !== false;

  if (checkOldGoogleReal) checkOldGoogleReal.checked = data.oldGoogleRealBrowser === true;
  if (checkOldYouTubeReal) checkOldYouTubeReal.checked = data.oldYouTubeRealBrowser === true;
  if (checkMemePack) checkMemePack.checked = data.enableMemePack === true;
  if (checkKeepWindows) checkKeepWindows.checked = data.keepWindowsOpen === true;
  if (checkSingleClick) checkSingleClick.checked = data.singleClickOpen === true;
  if (sliderBrightness) {
    const b = Number(data.brightness) || 0;
    sliderBrightness.value = b;
    if (brightnessValLabel) brightnessValLabel.textContent = b > 0 ? '+' + b : String(b);
  }
});

if (checkOldGoogleReal) {
  checkOldGoogleReal.addEventListener('change', () => {
    chrome.storage.local.set({ oldGoogleRealBrowser: checkOldGoogleReal.checked });
  });
}

if (checkOldYouTubeReal) {
  checkOldYouTubeReal.addEventListener('change', () => {
    chrome.storage.local.set({ oldYouTubeRealBrowser: checkOldYouTubeReal.checked });
  });
}

if (checkMemePack) {
  checkMemePack.addEventListener('change', () => {
    chrome.storage.local.set({ enableMemePack: checkMemePack.checked }, notifySettingsChange);
  });
}

if (checkKeepWindows) {
  checkKeepWindows.addEventListener('change', () => {
    chrome.storage.local.set({ keepWindowsOpen: checkKeepWindows.checked }, notifySettingsChange);
  });
}

if (checkSingleClick) {
  checkSingleClick.addEventListener('change', () => {
    chrome.storage.local.set({ singleClickOpen: checkSingleClick.checked }, notifySettingsChange);
  });
}

if (sliderBrightness) {
  function applyBrightnessChange() {
    const b = Number(sliderBrightness.value) || 0;
    if (brightnessValLabel) brightnessValLabel.textContent = b > 0 ? '+' + b : String(b);
    chrome.storage.local.set({ brightness: b }, () => {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'XP_BRIGHTNESS_CHANGED',
              brightness: b
            }).catch(() => {});
          }
        }
      });
    });
  }
  sliderBrightness.addEventListener('input', applyBrightnessChange);
  sliderBrightness.addEventListener('change', applyBrightnessChange);
}



function broadcastOverlaySettings() {
  const settings = {
    masterEnabled: checkOverlayMaster ? checkOverlayMaster.checked : false
  };

  chrome.storage.local.set({ xpOverlaySettings: settings }, () => {
    try {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'XP_OVERLAY_SETTINGS_CHANGED',
              settings: settings
            }).catch(() => {});
          }
        }
      });
    } catch (_) {}
  });
}

if (checkOverlayMaster) {
  checkOverlayMaster.addEventListener('change', broadcastOverlaySettings);
}

function notifySettingsChange() {
  try {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'XP_EXTENSION_SETTINGS_CHANGED',
            openInIE: switchOpenIe ? switchOpenIe.checked : true,
            enableMemePack: checkMemePack ? checkMemePack.checked : false,
            keepWindowsOpen: checkKeepWindows ? checkKeepWindows.checked : false,
            singleClickOpen: checkSingleClick ? checkSingleClick.checked : false,
            games: true
          }).catch(() => {});
        }
      }
    });
  } catch (_) {}
}

// Toggle Open in IE Switch
switchOpenIe.addEventListener('change', () => {
  const isEnabled = switchOpenIe.checked;
  chrome.storage.local.set({ openInIE: isEnabled }, notifySettingsChange);
});

// Theme Mode Selector
if (selectThemeMode) {
  selectThemeMode.addEventListener('change', () => {
    const mode = selectThemeMode.value || 'light';
    applyTheme(mode);
    chrome.storage.local.set({ themeMode: mode }, () => {
      try {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'XP_EXTENSION_SETTINGS_CHANGED',
                themeMode: mode
              }).catch(() => {});
            }
          }
        });
      } catch (_) {}
    });
  });
}

// Helper to recursively extract the full bookmarks hierarchy (folders and links)
function extractBookmarkTree(nodes) {
  const result = [];
  if (!nodes || !Array.isArray(nodes)) return result;

  for (const node of nodes) {
    if (node.url && (node.url.startsWith('http://') || node.url.startsWith('https://'))) {
      let domain = '';
      try {
        domain = new URL(node.url).hostname;
      } catch (_) {}
      
      const title = (node.title || domain || 'Bookmark').trim();
      result.push({
        type: 'bookmark',
        title: title,
        url: node.url,
        icon: domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32` : '/images/xp/icons/InternetExplorer6.png'
      });
    } else if (node.children && Array.isArray(node.children)) {
      const folderTitle = (node.title || '').trim();
      const children = extractBookmarkTree(node.children);
      
      // Top-level root containers in Chrome / Chromium:
      // - Root (id "0", "root________", or empty title)
      // - Bookmarks bar (id "1", or title "Bookmarks bar", "Bookmarks menu", "Favorites bar")
      // Hoist their children directly into the root Bookmarks folder on XP desktop
      const isRootContainer = node.id === '0' ||
                              node.id === '1' ||
                              node.id === 'root________' ||
                              !folderTitle ||
                              folderTitle.toLowerCase() === 'bookmarks bar' ||
                              folderTitle.toLowerCase() === 'bookmarks menu' ||
                              folderTitle.toLowerCase() === 'favorites bar';

      if (isRootContainer) {
        result.push(...children);
      } else if (children.length > 0) {
        result.push({
          type: 'folder',
          title: folderTitle || 'Folder',
          children: children
        });
      }
    }
  }
  return result;
}

// Import Bookmarks to XP Desktop
btnImportBookmarks.addEventListener('click', () => {
  btnImportBookmarks.disabled = true;
  bookmarkStatusMsg.textContent = 'Reading bookmarks...';

  if (!chrome.bookmarks || !chrome.bookmarks.getTree) {
    bookmarkStatusMsg.textContent = 'Bookmarks API not available.';
    btnImportBookmarks.disabled = false;
    return;
  }

  chrome.bookmarks.getTree((tree) => {
    const bookmarkTree = extractBookmarkTree(tree);
    if (!bookmarkTree.length) {
      bookmarkStatusMsg.textContent = 'No bookmarks found.';
      btnImportBookmarks.disabled = false;
      return;
    }

    // Save bookmarks to storage for persistence
    chrome.storage.local.set({ xpUserBookmarks: bookmarkTree }, () => {
      // Send command to all simulator tabs with playSound: true
      chrome.tabs.query({}, (tabs) => {
        let sentCount = 0;
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'XP_IMPORT_BOOKMARKS',
              bookmarks: bookmarkTree,
              playSound: false
            }).then(() => { sentCount++; }).catch(() => {});
          }
        }
        bookmarkStatusMsg.textContent = `Imported bookmarks to Desktop!`;
        btnImportBookmarks.disabled = false;
        setTimeout(() => {
          if (bookmarkStatusMsg.textContent.includes('Imported')) {
            bookmarkStatusMsg.textContent = '';
          }
        }, 3500);
      });
    });
  });
});

// Import Shortcuts to XP Desktop
const btnImportShortcuts = document.getElementById('btn-import-shortcuts');
const shortcutStatusMsg = document.getElementById('shortcut-status-msg');

if (btnImportShortcuts) {
  btnImportShortcuts.addEventListener('click', () => {
    btnImportShortcuts.disabled = true;
    if (shortcutStatusMsg) shortcutStatusMsg.textContent = 'Reading top shortcuts...';

    if (!chrome.topSites || !chrome.topSites.get) {
      if (shortcutStatusMsg) shortcutStatusMsg.textContent = 'TopSites API not available.';
      btnImportShortcuts.disabled = false;
      return;
    }

    chrome.topSites.get((sites) => {
      const formatted = (sites || []).map(s => {
        let domain = '';
        try { domain = new URL(s.url).hostname; } catch (_) {}
        return {
          title: s.title || domain || 'Shortcut',
          url: s.url,
          domain: domain,
          icon: domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : '/images/xp/icons/InternetExplorer6.png'
        };
      });

      if (!formatted.length) {
        if (shortcutStatusMsg) shortcutStatusMsg.textContent = 'No shortcuts found.';
        btnImportShortcuts.disabled = false;
        return;
      }

      chrome.storage.local.set({ xpUserShortcuts: formatted }, () => {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'XP_IMPORT_SHORTCUTS',
                shortcuts: formatted,
                playSound: false
              }).catch(() => {});
            }
          }
          if (shortcutStatusMsg) shortcutStatusMsg.textContent = `Imported shortcuts to Desktop!`;
          btnImportShortcuts.disabled = false;
          setTimeout(() => {
            if (shortcutStatusMsg && shortcutStatusMsg.textContent.includes('Imported')) {
              shortcutStatusMsg.textContent = '';
            }
          }, 3500);
        });
      });
    });
  });
}

btnSaveUrl.addEventListener('click', () => {
  let val = (inputUrl.value || '').trim();
  if (!val) val = DEFAULT_SIMULATOR_URL;
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = 'https://' + val;
  }
  inputUrl.value = val;
  chrome.storage.local.set({ simulatorUrl: val }, () => {
    showStatus('Saved!');
  });
});

btnResetUrl.addEventListener('click', () => {
  inputUrl.value = DEFAULT_SIMULATOR_URL;
  chrome.storage.local.set({ simulatorUrl: DEFAULT_SIMULATOR_URL }, () => {
    showStatus('Reset to default!');
  });
});

function showStatus(text) {
  statusMsg.textContent = text;
  setTimeout(() => {
    if (statusMsg.textContent === text) {
      statusMsg.textContent = '';
    }
  }, 2000);
}

