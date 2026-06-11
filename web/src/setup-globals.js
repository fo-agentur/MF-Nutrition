/* Must be imported BEFORE the ported prototype modules.
   They reference a global `React` (and window.lucide) at eval/runtime. */
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { createIcons, icons } from 'lucide';

window.React = React;
window.ReactDOM = ReactDOMClient;
window.lucide = { createIcons: (opts = {}) => createIcons({ icons, ...opts }) };

function syncAppViewportHeight() {
  // The shell fills the screen via `position: fixed; inset: 0` (see app.css), which
  // already resolves to the real standalone/Safari viewport. --mf-app-height is only
  // a fallback for non-fixed surfaces (e.g. the auth screen). Use the *visible*
  // viewport (visualViewport), falling back to innerHeight. We deliberately do NOT
  // mix in screen.height: on iOS that is the full physical height and overshoots the
  // usable area, which previously left the shell taller than the screen.
  const visual = window.visualViewport && window.visualViewport.height;
  const h = visual || window.innerHeight || 0;
  if (h) document.documentElement.style.setProperty('--mf-app-height', `${h}px`);
}

syncAppViewportHeight();
window.addEventListener('resize', syncAppViewportHeight, { passive: true });
window.addEventListener('orientationchange', syncAppViewportHeight, { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncAppViewportHeight, { passive: true });
  window.visualViewport.addEventListener('scroll', syncAppViewportHeight, { passive: true });
}

/* Installed-PWA shell height. In standalone the WKWebView is exactly
   fullscreen, but iOS regularly reports a SHORT layout viewport (launch bug),
   and position:fixed/inset:0 inherits that short height — the shell then ends
   ~60-100px above the screen bottom and the body background shows as a dead
   band under the nav. screen.height is exact in standalone (no browser
   chrome), so pin the shell to it. Never applied in Safari browser mode,
   where toolbars legitimately shrink the viewport. */
function isStandalone() {
  return navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
}
function syncShellHeight() {
  if (!isStandalone()) {
    document.documentElement.style.removeProperty('--mf-shell-h');
    return;
  }
  const h = Math.max(window.innerHeight || 0, (window.screen && window.screen.height) || 0);
  if (h) document.documentElement.style.setProperty('--mf-shell-h', `${h}px`);
}
syncShellHeight();
window.addEventListener('resize', syncShellHeight, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(syncShellHeight, 250), { passive: true });
window.addEventListener('pageshow', syncShellHeight);

/* iOS keyboard bug: when an input near the bottom is focused, iOS scrolls the
   whole window up and often leaves it there after the keyboard closes. With an
   overflow:hidden shell this shows as "the app is shifted up / the bottom nav is
   half cut off". Snap the window back whenever the keyboard goes away. */
function snapWindowBack() {
  // In the installed PWA (standalone WKWebView) the keyboard pan can leave
  // window.scrollY at 0 while only visualViewport.offsetTop is displaced —
  // check both, otherwise the restore never fires there.
  const vvOffset = window.visualViewport ? window.visualViewport.offsetTop : 0;
  if (window.scrollY || document.documentElement.scrollTop || vvOffset) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}
function keyboardLikelyOpen() {
  const ae = document.activeElement;
  return !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
}

document.addEventListener('focusout', () => { setTimeout(snapWindowBack, 50); }, true);
if (window.visualViewport) {
  let lastH = window.visualViewport.height;
  window.visualViewport.addEventListener('resize', () => {
    // keyboard closed -> viewport grew back -> restore scroll
    if (window.visualViewport.height > lastH) snapWindowBack();
    lastH = window.visualViewport.height;
  }, { passive: true });
  // iOS can also pan the webview without a height change (visualViewport
  // 'scroll' only). If no keyboard is up there is never a legit reason for
  // the window to be displaced — snap straight back, otherwise the displaced
  // strip stays visible below the nav until the next keyboard cycle.
  window.visualViewport.addEventListener('scroll', () => {
    if (!keyboardLikelyOpen()) snapWindowBack();
  }, { passive: true });
}
// Returning to the PWA (app switch / lock screen) can resurface a webview that
// iOS left panned while we were backgrounded — re-anchor on every resume.
window.addEventListener('pageshow', () => { setTimeout(snapWindowBack, 50); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) setTimeout(snapWindowBack, 50);
});
window.addEventListener('orientationchange', () => { setTimeout(snapWindowBack, 250); });
