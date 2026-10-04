/**
 * Windows XP Simulator - Google Classic Enhancer
 * Ported from Google Classic (google-classic-master by lemonsqueeze & mungushume)
 * Cleans up Google Search & Images into a fast, light, retro Google XP experience.
 */
(function () {
  'use strict';

  // Inject Classic Google CSS Styles
  function injectClassicStyles() {
    if (document.getElementById('xp-google-classic-style')) return;
    const style = document.createElement('style');
    style.id = 'xp-google-classic-style';
    style.textContent = `
      /* Hide ads, sponsored content, sidebars, and privacy popups */
      #rhs_block, #tads, #topstuff table.ts, #bottomads, ._Ak, ._h0h,
      div#modeselector, div.lnsec {
        display: none !important;
      }

      /* Clean main layout width */
      #cnt #center_col, #cnt #foot, .mw {
        width: auto !important;
        max-width: 100% !important;
      }

      /* Classic search result container styling */
      li.g, div.g {
        margin-top: 4px !important;
        margin-bottom: 10px !important;
        padding: 6px 10px !important;
        border-radius: 4px !important;
        background-color: transparent !important;
        transition: background-color 0.15s ease-in-out;
      }

      li.g:hover, div.g:hover {
        background-color: #f5f8ff !important;
      }

      /* Result Title Links */
      .r a, h3.r a, h3 a {
        font-family: Arial, sans-serif !important;
        font-size: 16px !important;
        color: #1a0dab !important;
        text-decoration: underline !important;
      }

      .r a:visited, h3.r a:visited {
        color: #660099 !important;
      }

      /* Green URL bar */
      .kv, .s cite, cite {
        color: #008000 !important;
        font-size: 13px !important;
        font-style: normal !important;
      }

      /* Result Numbering Badge */
      .xp-result-number {
        font-weight: bold;
        color: #444;
        font-size: 13px;
        margin-right: 6px;
        font-family: Arial, sans-serif;
      }

      /* Result Favicon */
      .xp-result-favicon {
        width: 16px;
        height: 16px;
        vertical-align: middle;
        margin-right: 6px;
        display: inline-block;
      }

      /* Classic Google Images Thumbnail Borders */
      .images_table a img, #ires ol li.g img {
        border: 1px solid #dedede !important;
        box-shadow: 0 2px 3px rgba(0,0,0,0.1) !important;
        margin: 2px !important;
      }

      .images_table a img:hover, #ires ol li.g img:hover {
        box-shadow: 0 0 0 2px #3366cc !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Remove /url?q= tracking redirects so links open directly
  function cleanTrackingLinks() {
    try {
      const links = document.querySelectorAll('a[href*="/url?"]');
      links.forEach((a) => {
        try {
          const href = a.getAttribute('href');
          if (!href) return;

          let targetUrl = null;
          const matchQ = href.match(/[?&]q=([^&]+)/);
          const matchUrl = href.match(/[?&]url=([^&]+)/);

          if (matchQ && matchQ[1]) {
            targetUrl = decodeURIComponent(matchQ[1]);
          } else if (matchUrl && matchUrl[1]) {
            targetUrl = decodeURIComponent(matchUrl[1]);
          }

          if (targetUrl && targetUrl.startsWith('http') && !targetUrl.includes('google.com/search')) {
            a.href = targetUrl;
            a.removeAttribute('onmousedown');
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  // Add numbering & favicons to search results
  function addFaviconsAndNumbers() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const startParam = parseInt(urlParams.get('start') || '0', 10);
      
      const results = document.querySelectorAll('li.g, div.g');
      let count = startParam + 1;

      results.forEach((res) => {
        if (res.getAttribute('data-xp-classic-processed') === 'true') return;
        res.setAttribute('data-xp-classic-processed', 'true');

        const titleHeader = res.querySelector('h3, .r, .r a');
        if (!titleHeader) return;

        const mainLink = res.querySelector('a[href^="http"]');
        if (!mainLink) return;

        // Extract Domain for Favicon
        let domain = '';
        try {
          domain = new URL(mainLink.href).hostname;
        } catch (_) {}

        // Insert Number Badge
        const numSpan = document.createElement('span');
        numSpan.className = 'xp-result-number';
        numSpan.textContent = count + '.';

        // Insert Favicon
        if (domain) {
          const favImg = document.createElement('img');
          favImg.className = 'xp-result-favicon';
          favImg.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
          favImg.alt = '';
          favImg.onerror = () => { favImg.style.display = 'none'; };
          titleHeader.parentNode.insertBefore(favImg, titleHeader);
        }

        titleHeader.parentNode.insertBefore(numSpan, titleHeader);
        count++;
      });
    } catch (_) {}
  }

  // Process classic Google Images links
  function processGoogleImages() {
    try {
      if (!window.location.href.includes('tbm=isch') && !window.location.href.includes('/imghp')) return;

      const imgLinks = document.querySelectorAll('a[href*="imgurl="]');
      imgLinks.forEach((a) => {
        try {
          const matchImg = a.href.match(/imgurl=([^&]+)/);
          if (matchImg && matchImg[1]) {
            a.href = decodeURIComponent(matchImg[1]);
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  // Ensure search forms preserve classic flags (gbv=1, sout=1, igu=1)
  function enforceClassicFormParams() {
    try {
      const forms = document.querySelectorAll('form[action*="/search"]');
      forms.forEach((form) => {
        ['gbv', 'sout', 'igu'].forEach((paramName) => {
          if (!form.querySelector(`input[name="${paramName}"]`)) {
            const hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.name = paramName;
            hidden.value = '1';
            form.appendChild(hidden);
          }
        });
      });
    } catch (_) {}
  }

  // Initialize Classic Google Enhancer
  function init() {
    injectClassicStyles();
    cleanTrackingLinks();
    addFaviconsAndNumbers();
    processGoogleImages();
    enforceClassicFormParams();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Dynamic DOM Observer for SPA search navigations
  const observer = new MutationObserver(() => {
    cleanTrackingLinks();
    addFaviconsAndNumbers();
    processGoogleImages();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
