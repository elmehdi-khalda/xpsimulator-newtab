/**
 * Windows XP Simulator - Google Classic Enhancer
 * Ported from Google Classic (google-classic-master by lemonsqueeze & mungushume)
 * Cleans up Google Search & Images into a fast, light, retro Google XP experience.
 */
(function () {
  'use strict';

  function isInternetExplorer() {
    try {
      if (window.self === window.top) return false;
      if (window.name === 'xp-ie-iframe' || (typeof window.name === 'string' && window.name.includes('xp-ie'))) {
        return true;
      }
      try {
        if (window.parent && window.parent !== window && typeof window.parent.name === 'string' && window.parent.name.includes('xp-ie')) {
          return true;
        }
      } catch (_) {}
      if (window.location.search && (window.location.search.includes('igu=1') || window.location.search.includes('sout=1'))) {
        if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
          return Array.from(window.location.ancestorOrigins).some(origin => 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.startsWith('chrome-extension://') ||
            origin.includes('vercel.app') ||
            origin.includes('elmehdikhalda')
          );
        }
      }
    } catch (_) {}
    return false;
  }

  if (isInternetExplorer()) {
    runClassic();
  } else {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['oldGoogleRealBrowser'], (res) => {
          if (res && res.oldGoogleRealBrowser === true) {
            runClassic();
          }
        });
      }
    } catch (_) {}
  }

  function runClassic() {
  // Inject Classic Google CSS Styles
  function injectClassicStyles() {
    if (document.getElementById('xp-google-classic-style')) return;
    const style = document.createElement('style');
    style.id = 'xp-google-classic-style';
    style.textContent = `
      /* ========================================================
         Google 2009 Classic Homepage & Landing Page Restyling
         ======================================================== */
      
      /* Pure white background & classic font */
      body, html {
        background-color: #ffffff !important;
        font-family: Arial, Helvetica, sans-serif !important;
      }

      /* Hide modern SVG Google logo and greeting text */
      svg.ESTs9d, svg[aria-label="Google"], .uZekje svg, .sI1XGe svg,
      header.RHL8Vb, .X1pLC header {
        display: none !important;
      }

      /* Homepage classic Catull logo */
      .xp-classic-logo, #xp-classic-logo {
        display: block !important;
        width: 276px !important;
        height: 110px !important;
        margin: 22px auto 16px auto !important;
        image-rendering: auto;
      }

      /* Logo replacement for fallback <img> elements */
      img.lnXdpd, #hplogo, img[alt="Google"]:not(.xp-classic-logo) {
        box-sizing: border-box !important;
        content: url("https://www.google.com/intl/en_ALL/images/logo.gif") !important;
        width: 276px !important;
        height: 110px !important;
        max-height: 110px !important;
        object-fit: contain !important;
        margin: 20px auto 14px auto !important;
      }

      /* Prevent duplicate logos if xp-classic-logo is present */
      body:has(#xp-classic-logo) img.lnXdpd,
      body:has(#xp-classic-logo) #hplogo,
      body:has(#xp-classic-logo) img[alt="Google"]:not(#xp-classic-logo) {
        display: none !important;
      }

      /* Classic search results header logo */
      #logo img, header a[aria-label="Google"] svg, .logo img, #logocont img {
        box-sizing: border-box !important;
        content: url("https://www.google.com/intl/en_ALL/images/logo.gif") !important;
        width: 120px !important;
        height: 44px !important;
        object-fit: contain !important;
      }

      /* Classic 2009 Sharp Rectangular Search Box */
      .RNNXgb, .em4Ftd, div[jsname="RNNXgb"] {
        border-radius: 0px !important;
        border: 1px solid #707070 !important;
        border-top-color: #555555 !important;
        box-shadow: none !important;
        background: #ffffff !important;
        height: 34px !important;
        min-height: 34px !important;
        max-width: 584px !important;
        width: 100% !important;
        margin: 0 auto !important;
        padding: 0 8px !important;
        display: flex !important;
        align-items: center !important;
      }

      .RNNXgb:hover, .RNNXgb:focus-within {
        border-color: #707070 !important;
        box-shadow: none !important;
      }

      .SDkEP {
        padding: 0 !important;
        height: 28px !important;
      }

      .RNNXgb .gLFyf, .RNNXgb textarea[name="q"], .RNNXgb input[name="q"] {
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 16px !important;
        line-height: 24px !important;
        height: 24px !important;
        color: #000000 !important;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        padding: 1px 2px !important;
        margin: 0 !important;
        resize: none !important;
      }

      /* Fallback inputs outside .RNNXgb */
      input[name="q"]:not(.RNNXgb input),
      input.lst,
      .ds input {
        border: 1px solid #707070 !important;
        border-top-color: #555555 !important;
        border-radius: 0px !important;
        background: #ffffff !important;
        color: #000000 !important;
        height: 30px !important;
        line-height: 24px !important;
        padding: 2px 6px !important;
        font-size: 16px !important;
        box-sizing: border-box !important;
      }

      /* Hide modern search bar clutter: Lens, Voice, Camera, Search Glass inside input */
      .XDyW0e, .nDcEnd, .M2vfTd, .dRYYxd, .v7V3Qb, .hOoBg, .bkHsEd,
      [aria-label*="Lens"], [aria-label*="lens"],
      [aria-label*="voice"], [aria-label*="Voice"],
      [aria-label*="vocale"], [aria-label*="Vocale"],
      [aria-label*="Recherche vocale"], [aria-label*="Recherche par image"],
      [aria-label*="Search by voice"], [aria-label*="Search by image"] {
        display: none !important;
      }

      /* Classic 2009 Gray Action Buttons ("Google Search" / "I'm Feeling Lucky") */
      .FPdoLc, .tfB0Bf {
        padding-top: 14px !important;
        text-align: center !important;
        margin-top: 0 !important;
      }

      .FPdoLc input[type="submit"], .tfB0Bf input[type="submit"],
      input[name="btnK"], input[name="btnI"], .gNO89b, .RNmpXc {
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 12px !important;
        font-weight: normal !important;
        color: #000000 !important;
        background: #ece9d8 !important;
        background: linear-gradient(to bottom, #ffffff 0%, #ece9d8 100%) !important;
        border: 1px solid #7f9db9 !important;
        border-radius: 0px !important;
        box-shadow: none !important;
        padding: 3px 12px !important;
        height: 25px !important;
        min-height: 25px !important;
        line-height: 17px !important;
        margin: 8px 4px !important;
        cursor: pointer !important;
        display: inline-block !important;
        text-shadow: none !important;
      }

      .FPdoLc input[type="submit"]:hover, .tfB0Bf input[type="submit"]:hover,
      input[name="btnK"]:hover, input[name="btnI"]:hover,
      .gNO89b:hover, .RNmpXc:hover {
        background: #fdfdfd !important;
        background: linear-gradient(to bottom, #ffffff 0%, #e2eaf5 100%) !important;
        border-color: #316ac5 !important;
        box-shadow: none !important;
      }

      /* Classic 2009 Header & Links */
      header#gb, .gb_y {
        font-family: Arial, Helvetica, sans-serif !important;
        background: transparent !important;
      }

      .gb_6, .gb_7 a, .gb_A, .gb_z a, .gb_d {
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 12px !important;
        color: #0000cc !important;
        text-decoration: underline !important;
        font-weight: normal !important;
      }

      /* Hide modern Google Apps launcher grid (waffle) & modern footer elements */
      #gbwa, .gb_L, footer, .KxwPGc, .c93Gbe, .o3j99, .u732Oi, .fbar, .p4ecBe, div[role="contentinfo"] {
        display: none !important;
      }

      /* Dark Mode Support for Classic Google */
      html[data-xp-theme-mode="dark"],
      html[data-xp-theme-mode="dark"] body {
        background-color: #121212 !important;
        color: #e8eaed !important;
      }

      html[data-xp-theme-mode="dark"] .RNNXgb,
      html[data-xp-theme-mode="dark"] div[jsname="RNNXgb"] {
        background: #202124 !important;
        border-color: #5f6368 !important;
      }

      html[data-xp-theme-mode="dark"] .gLFyf,
      html[data-xp-theme-mode="dark"] textarea[name="q"],
      html[data-xp-theme-mode="dark"] input[name="q"] {
        color: #ffffff !important;
      }

      html[data-xp-theme-mode="dark"] input[name="btnK"],
      html[data-xp-theme-mode="dark"] input[name="btnI"],
      html[data-xp-theme-mode="dark"] .gNO89b,
      html[data-xp-theme-mode="dark"] .RNmpXc {
        background: #303134 !important;
        color: #e8eaed !important;
        border-color: #5f6368 !important;
      }

      html[data-xp-theme-mode="dark"] a {
        color: #8ab4f8 !important;
      }

      .u732Oi, .fbar.p4ecBe {
        display: none !important;
      }

      /* ========================================================
         Search Results & Search Cleaning Styles
         ======================================================== */

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
        font-family: Arial, Helvetica, sans-serif !important;
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
        font-family: Arial, Helvetica, sans-serif;
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

  // Apply Classic 2009 Google Homepage Elements
  function applyClassicHomepage() {
    try {
      const isSearchPage = window.location.pathname.includes('/search') || (new URLSearchParams(window.location.search)).has('q');

      if (!isSearchPage) {
        // --- HOMEPAGE / LANDING PAGE ---
        // Hide modern greeting text and SVG logos
        const modernSvgs = document.querySelectorAll('svg.ESTs9d, svg[aria-label="Google"], .uZekje svg, .sI1XGe svg, header.RHL8Vb');
        modernSvgs.forEach((el) => {
          el.style.setProperty('display', 'none', 'important');
        });

        // Check if a native Google logo img exists on the page
        const nativeLogo = document.querySelector('img.lnXdpd, #hplogo, img[alt="Google"]:not(#xp-classic-logo)');
        if (nativeLogo) {
          if (!nativeLogo.src.includes('intl/en_ALL/images/logo.gif')) {
            nativeLogo.src = 'https://www.google.com/intl/en_ALL/images/logo.gif';
            nativeLogo.removeAttribute('srcset');
          }
          const dup = document.getElementById('xp-classic-logo');
          if (dup) dup.remove();
        } else {
          if (!document.getElementById('xp-classic-logo')) {
            const classicLogo = document.createElement('img');
            classicLogo.id = 'xp-classic-logo';
            classicLogo.className = 'xp-classic-logo';
            classicLogo.src = 'https://www.google.com/intl/en_ALL/images/logo.gif';
            classicLogo.alt = 'Google';
            classicLogo.title = 'Google';

            const logoContainer = document.querySelector('.uZekje, .naW5gc, .sI1XGe, .k1zIA');
            if (logoContainer) {
              logoContainer.prepend(classicLogo);
            } else {
              const searchForm = document.querySelector('form[action*="/search"]');
              if (searchForm && searchForm.parentNode) {
                searchForm.parentNode.insertBefore(classicLogo, searchForm);
              }
            }
          }
        }
      } else {
        // --- SEARCH RESULTS PAGE ---
        const navLogos = document.querySelectorAll('header a[aria-label="Google"] img, #logo img, .logo img');
        navLogos.forEach((img) => {
          if (!img.src.includes('intl/en_ALL/images/logo.gif')) {
            img.src = 'https://www.google.com/intl/en_ALL/images/logo.gif';
            img.removeAttribute('srcset');
          }
        });
      }

      // Universal duplicate guard: If multiple Google logos are found on homepage, hide all except the first one
      if (!isSearchPage) {
        const homeLogos = document.querySelectorAll('#xp-classic-logo, img.lnXdpd, #hplogo, img[alt="Google"]');
        if (homeLogos.length > 1) {
          for (let i = 1; i < homeLogos.length; i++) {
            homeLogos[i].style.setProperty('display', 'none', 'important');
          }
        }
      }
    } catch (_) {}
  }

  // Initialize Classic Google Enhancer
  function init() {
    injectClassicStyles();
    applyClassicHomepage();
    cleanTrackingLinks();
    addFaviconsAndNumbers();
    processGoogleImages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Dynamic DOM Observer for SPA search navigations
  const observer = new MutationObserver(() => {
    applyClassicHomepage();
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
  }
})();

