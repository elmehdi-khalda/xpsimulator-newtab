const DEFAULT_SIMULATOR_URL = 'https://xpsimulator.vercel.app';

const switchOpenIe = document.getElementById('switch-open-ie');
const btnImportBookmarks = document.getElementById('btn-import-bookmarks');
const bookmarkStatusMsg = document.getElementById('bookmark-status-msg');
const inputUrl = document.getElementById('input-simulator-url');
const btnSaveUrl = document.getElementById('btn-save-url');
const btnResetUrl = document.getElementById('btn-reset-url');
const statusMsg = document.getElementById('status-msg');

// Load initial settings
chrome.storage.local.get(['simulatorUrl', 'openInIE'], (data) => {
  inputUrl.value = data.simulatorUrl || DEFAULT_SIMULATOR_URL;
  switchOpenIe.checked = data.openInIE !== false;
});

// Toggle Open in IE Switch
switchOpenIe.addEventListener('change', () => {
  const isEnabled = switchOpenIe.checked;
  chrome.storage.local.set({ openInIE: isEnabled }, () => {
    // Notify all open tabs about settings update
    try {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'XP_EXTENSION_SETTINGS_CHANGED',
              openInIE: isEnabled
            }).catch(() => {});
          }
        }
      });
    } catch (_) {}
  });
});

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