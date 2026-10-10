/**
 * Windows XP Simulator - Offscreen Clipboard Helper
 * Reads OS clipboard using extension privileges without browser prompts.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'XP_READ_CLIPBOARD_OFFSCREEN') {
    let text = '';
    try {
      const sandbox = document.getElementById('sandbox');
      if (sandbox) {
        sandbox.value = '';
        sandbox.focus();
        sandbox.select();
        if (document.execCommand('paste')) {
          text = sandbox.value;
        }
      }
    } catch (_) {}

    if (text && text.trim()) {
      sendResponse({ text: text.trim() });
      return true;
    }

    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(t => {
        sendResponse({ text: (t || '').trim() });
      }).catch(() => {
        sendResponse({ text: (text || '').trim() });
      });
      return true;
    }

    sendResponse({ text: (text || '').trim() });
    return true;
  }
});
