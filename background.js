/**
 * Windows XP Simulator - Background Service Worker
 * Manages iframe unblocking, YouTube 403 videoplayback Referer/Origin headers, and standalone app window.
 */

async function setupRules() {
  try {
    const dynamicRules = [
  {
    "id": 1,
    "priority": 10,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "x-frame-options",
          "operation": "remove"
        },
        {
          "header": "X-Frame-Options",
          "operation": "remove"
        },
        {
          "header": "content-security-policy",
          "operation": "remove"
        },
        {
          "header": "Content-Security-Policy",
          "operation": "remove"
        },
        {
          "header": "content-security-policy-report-only",
          "operation": "remove"
        },
        {
          "header": "Content-Security-Policy-Report-Only",
          "operation": "remove"
        },
        {
          "header": "x-content-security-policy",
          "operation": "remove"
        },
        {
          "header": "X-Content-Security-Policy",
          "operation": "remove"
        },
        {
          "header": "x-webkit-csp",
          "operation": "remove"
        },
        {
          "header": "X-WebKit-CSP",
          "operation": "remove"
        },
        {
          "header": "frame-options",
          "operation": "remove"
        },
        {
          "header": "permissions-policy",
          "operation": "remove"
        },
        {
          "header": "Permissions-Policy",
          "operation": "remove"
        },
        {
          "header": "feature-policy",
          "operation": "remove"
        },
        {
          "header": "Feature-Policy",
          "operation": "remove"
        }
      ]
    },
    "condition": {
      "urlFilter": "*",
      "resourceTypes": [
        "main_frame",
        "sub_frame",
        "xmlhttprequest",
        "other"
      ]
    }
  },
  {
    "id": 2,
    "priority": 20,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "access-control-allow-origin",
          "operation": "set",
          "value": "https://www.youtube.com"
        },
        {
          "header": "access-control-allow-credentials",
          "operation": "set",
          "value": "true"
        },
        {
          "header": "access-control-allow-methods",
          "operation": "set",
          "value": "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        },
        {
          "header": "access-control-allow-headers",
          "operation": "set",
          "value": "*"
        },
        {
          "header": "cross-origin-resource-policy",
          "operation": "set",
          "value": "cross-origin"
        }
      ]
    },
    "condition": {
      "urlFilter": "||googlevideo.com/",
      "resourceTypes": [
        "media",
        "xmlhttprequest",
        "other",
        "sub_frame"
      ]
    }
  },
  {
    "id": 3,
    "priority": 20,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "access-control-allow-origin",
          "operation": "set",
          "value": "https://www.youtube.com"
        },
        {
          "header": "access-control-allow-credentials",
          "operation": "set",
          "value": "true"
        },
        {
          "header": "access-control-allow-methods",
          "operation": "set",
          "value": "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        },
        {
          "header": "access-control-allow-headers",
          "operation": "set",
          "value": "*"
        },
        {
          "header": "cross-origin-resource-policy",
          "operation": "set",
          "value": "cross-origin"
        }
      ]
    },
    "condition": {
      "urlFilter": "||youtube.com/",
      "resourceTypes": [
        "media",
        "xmlhttprequest",
        "other",
        "sub_frame"
      ]
    }
  },
  {
    "id": 4,
    "priority": 20,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "access-control-allow-origin",
          "operation": "set",
          "value": "https://www.youtube.com"
        },
        {
          "header": "access-control-allow-credentials",
          "operation": "set",
          "value": "true"
        },
        {
          "header": "cross-origin-resource-policy",
          "operation": "set",
          "value": "cross-origin"
        }
      ]
    },
    "condition": {
      "urlFilter": "||ytimg.com/",
      "resourceTypes": [
        "media",
        "xmlhttprequest",
        "image",
        "other",
        "sub_frame"
      ]
    }
  },
  {
    "id": 8,
    "priority": 20,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "access-control-allow-origin",
          "operation": "set",
          "value": "https://www.google.com"
        },
        {
          "header": "access-control-allow-credentials",
          "operation": "set",
          "value": "true"
        },
        {
          "header": "access-control-allow-methods",
          "operation": "set",
          "value": "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        },
        {
          "header": "access-control-allow-headers",
          "operation": "set",
          "value": "*"
        },
        {
          "header": "cross-origin-resource-policy",
          "operation": "set",
          "value": "cross-origin"
        }
      ]
    },
    "condition": {
      "urlFilter": "||google.com/",
      "resourceTypes": [
        "xmlhttprequest",
        "other",
        "sub_frame"
      ]
    }
  },
  {
    "id": 5,
    "priority": 15,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        {
          "header": "sec-fetch-dest",
          "operation": "set",
          "value": "document"
        },
        {
          "header": "sec-fetch-mode",
          "operation": "set",
          "value": "navigate"
        },
        {
          "header": "sec-fetch-site",
          "operation": "set",
          "value": "none"
        },
        {
          "header": "sec-fetch-user",
          "operation": "set",
          "value": "?1"
        }
      ]
    },
    "condition": {
      "urlFilter": "*",
      "resourceTypes": [
        "sub_frame"
      ]
    }
  },
  {
    "id": 7,
    "priority": 12,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "cross-origin-opener-policy",
          "operation": "set",
          "value": "same-origin"
        },
        {
          "header": "cross-origin-embedder-policy",
          "operation": "set",
          "value": "credentialless"
        },
        {
          "header": "cross-origin-resource-policy",
          "operation": "set",
          "value": "cross-origin"
        },
        {
          "header": "permissions-policy",
          "operation": "set",
          "value": "screen-wake-lock=*, cross-origin-isolated=*"
        },
        {
          "header": "Permissions-Policy",
          "operation": "set",
          "value": "screen-wake-lock=*, cross-origin-isolated=*"
        },
        {
          "header": "Document-Isolation-Policy",
          "operation": "set",
          "value": "isolate-and-credentialless"
        }
      ]
    },
    "condition": {
      "urlFilter": "*",
      "excludedRequestDomains": [
        "google.com",
        "google.co.uk",
        "google.ca",
        "google.de",
        "google.fr",
        "google.co.jp",
        "youtube.com",
        "youtu.be",
        "googlevideo.com",
        "ytimg.com",
        "gstatic.com",
        "googleusercontent.com",
        "googleapis.com",
        "accounts.google.com"
      ],
      "excludedInitiatorDomains": [
        "google.com",
        "google.co.uk",
        "google.ca",
        "google.de",
        "google.fr",
        "google.co.jp",
        "youtube.com",
        "youtu.be",
        "googlevideo.com",
        "ytimg.com",
        "gstatic.com",
        "googleusercontent.com",
        "googleapis.com",
        "accounts.google.com"
      ],
      "resourceTypes": [
        "sub_frame"
      ]
    }
  },
  {
    "id": 12,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||a-ads.com/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest"
      ]
    }
  },
  {
    "id": 13,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||czernik.org/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 14,
    "priority": 10,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "Cross-Origin-Opener-Policy",
          "operation": "set",
          "value": "same-origin"
        },
        {
          "header": "Cross-Origin-Embedder-Policy",
          "operation": "set",
          "value": "credentialless"
        },
        {
          "header": "Cross-Origin-Resource-Policy",
          "operation": "set",
          "value": "cross-origin"
        },
        {
          "header": "Access-Control-Allow-Origin",
          "operation": "set",
          "value": "*"
        }
      ]
    },
    "condition": {
      "urlFilter": "||cyberpunk2077.lol/",
      "resourceTypes": [
        "sub_frame",
        "script",
        "xmlhttprequest",
        "other"
      ]
    }
  },
  {
    "id": 15,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||bauval.org/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 16,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||rtmark.net/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 17,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||094kk.com/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 18,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||jmosl.com/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 19,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||6opo.com/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 20,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||auqot.com/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 21,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||quge5.com/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  },
  {
    "id": 22,
    "priority": 10,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "||alwingulla.com/",
      "resourceTypes": [
        "script",
        "sub_frame",
        "xmlhttprequest",
        "ping",
        "other"
      ]
    }
  }
];

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);
    const removeIds = Array.from(new Set([...existingRuleIds, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]));

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeIds,
      addRules: dynamicRules
    });
    console.log('[Windows XP] DeclarativeNetRequest active: Subframes unblocked, CORS headers enabled & YouTube playback authorized.');
  } catch (err) {
    console.error('[Windows XP] Error updating declarativeNetRequest:', err);
  }
}

function initDefaultSettings() {
  chrome.storage.local.get(['openInIE'], (res) => {
    if (res.openInIE === undefined) {
      chrome.storage.local.set({ openInIE: true });
    }
  });
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.remove(['smallPlayer']);
  }
}

// Register dynamic rules on top-level start, installation, and browser startup
setupRules();
preloadSimulator();
initDefaultSettings();

chrome.runtime.onInstalled.addListener(() => {
  setupRules();
  preloadSimulator();
  initDefaultSettings();
});

chrome.runtime.onStartup.addListener(() => {
  setupRules();
  preloadSimulator();
  initDefaultSettings();
});

async function preloadSimulator() {
  try {
    const data = await chrome.storage.local.get(['simulatorUrl', 'cachedDesktop']);
    const targetUrl = data.simulatorUrl || 'https://xpsimulator.vercel.app';
    const base = new URL(targetUrl);

    // Pre-cache vital shell assets: bliss wallpaper, icons, cursors
    const coreAssets = [
      new URL('/images/xp/wallpaper/bliss.jpg', base).toString(),
      new URL('/images/xp/icons/MyComputer.png', base).toString(),
      new URL('/images/xp/icons/RecycleBinempty.png', base).toString(),
      new URL('/images/xp/icons/InternetExplorer6.png', base).toString(),
      new URL('/images/xp/icons/LiveDemo.png', base).toString(),
      new URL('/images/xp/icons/WindowsMedia.png', base).toString(),
      new URL('/images/xp/icons/Application.png', base).toString()
    ];

    if (data.cachedDesktop?.wallpaper && data.cachedDesktop.wallpaper.startsWith('http')) {
      coreAssets.push(data.cachedDesktop.wallpaper);
    }

    Promise.allSettled(coreAssets.map(u => fetch(u, { mode: 'no-cors', cache: 'force-cache' }))).catch(() => {});

    const res = await fetch(targetUrl, { mode: 'cors', cache: 'force-cache' }).catch(() => null);
    if (!res || !res.ok) return;
    const html = await res.text();
    const assetMatches = html.match(/(?:src|href)=["']([^"']+\.(?:js|css|png|jpg|mp3|cur|ani))["']/g) || [];
    const assetUrls = assetMatches.map(m => {
      const p = m.replace(/^(?:src|href)=["']|["']$/g, '');
      return new URL(p, base).toString();
    });
    await Promise.allSettled(assetUrls.slice(0, 60).map(u => fetch(u, { mode: 'no-cors', cache: 'force-cache' })));
    console.log('[Windows XP] Simulator & desktop assets preloaded in background cache.');
  } catch (err) {
    console.debug('[Windows XP] Preload skipped:', err);
  }
}

let creatingOffscreenPromise = null;

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  if (chrome.runtime.getContexts) {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });
    if (existingContexts.length > 0) return;
  }
  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }
  creatingOffscreenPromise = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'Read OS clipboard for Windows XP simulator Paste Link feature'
  });
  await creatingOffscreenPromise;
  creatingOffscreenPromise = null;
}

function sanitizeShareForExtension(share) {
  if (!share) return null;
  const copy = { ...share };
  if (copy.files && Array.isArray(copy.files)) {
    copy.files = copy.files.map(f => {
      if (!f) return null;
      const { content_data, ...rest } = f;
      return rest;
    }).filter(Boolean);
  }
  return copy;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'XP_GET_REDUX_CSS') {
    fetch(chrome.runtime.getURL('redux/styles.css'))
      .then(res => res.text())
      .then(css => sendResponse({ css }))
      .catch(() => sendResponse({ css: '' }));
    return true;
  }

  if (message.action === 'XP_READ_CLIPBOARD') {
    (async () => {
      try {
        await ensureOffscreenDocument();
        chrome.runtime.sendMessage({ action: 'XP_READ_CLIPBOARD_OFFSCREEN' }, (res) => {
          sendResponse({ text: (res && res.text) ? res.text : '' });
        });
      } catch (err) {
        sendResponse({ text: '' });
      }
    })();
    return true;
  }

  if (message.action === 'openAppWindow') {
    const url = message.url || 'https://xpsimulator.vercel.app';
    chrome.windows.create({
      url: url,
      type: 'popup',
      width: Math.min(1280, screen.availWidth || 1280),
      height: Math.min(800, screen.availHeight || 800),
      focused: true
    }, (newWin) => {
      sendResponse({ success: true, windowId: newWin ? newWin.id : null });
    });
    return true;
  }

  if (message.action === 'XP_DESKTOP_CACHE_SYNC') {
    if (message.data) {
      chrome.storage.local.set({ cachedDesktop: message.data });
      if (message.data.wallpaper && message.data.wallpaper.startsWith('http')) {
        fetch(message.data.wallpaper, { mode: 'no-cors', cache: 'force-cache' }).catch(() => {});
      }
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'XP_GET_BOOKMARKS_TREE') {
    if (chrome.bookmarks && chrome.bookmarks.getTree) {
      chrome.bookmarks.getTree((tree) => {
        const bookmarks = extractBookmarkTree(tree);
        sendResponse({ success: true, bookmarks });
      });
      return true;
    } else {
      sendResponse({ success: false, bookmarks: [] });
      return true;
    }
  }

  if (message.action === 'XP_GET_TOP_SITES') {
    if (chrome.topSites && chrome.topSites.get) {
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
        sendResponse({ success: true, shortcuts: formatted });
      });
      return true;
    } else {
      sendResponse({ success: false, shortcuts: [] });
      return true;
    }
  }

  if (message.action === 'XP_SHARE_UPDATE' && message.share) {
    const cleanShare = sanitizeShareForExtension(message.share);
    chrome.storage.local.get(['xp_network_shares'], (data) => {
      let shares = Array.isArray(data.xp_network_shares) ? data.xp_network_shares.map(sanitizeShareForExtension).filter(Boolean) : [];
      shares = shares.filter(s => s && s.id !== cleanShare.id);
      shares.push(cleanShare);
      chrome.storage.local.set({ xp_network_shares: shares }, () => {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'XP_EXTENSION_SHARE_SYNC',
              share: cleanShare
            }).catch(() => {});
          }
        });
      });
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'XP_SHARE_REMOVE' && message.id) {
    chrome.storage.local.get(['xp_network_shares'], (data) => {
      let shares = Array.isArray(data.xp_network_shares) ? data.xp_network_shares : [];
      shares = shares.filter(s => s && s.id !== message.id);
      chrome.storage.local.set({ xp_network_shares: shares });
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'XP_GET_SHARES') {
    chrome.storage.local.get(['xp_network_shares'], (data) => {
      const shares = Array.isArray(data.xp_network_shares) ? data.xp_network_shares.map(sanitizeShareForExtension).filter(Boolean) : [];
      sendResponse({ success: true, shares });
    });
    return true;
  }
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

