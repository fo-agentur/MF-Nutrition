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

/* Installed-PWA shell height. iOS regularly reports a SHORT layout viewport
   at launch (innerHeight lags), and position:fixed/inset:0 inherits that
   short height — the shell then ends well above the screen bottom and a dead
   band shows under the nav. screen.height is no good either: on modern iOS
   the standalone webview starts BELOW the opaque status bar, so the full
   screen height overshoots and the nav gets clipped. visualViewport.height
   is the one value that reflects the REAL visible webview on every device —
   measure it (guarded by innerHeight) and pin the shell to it. Never applied
   in Safari browser mode, where toolbars legitimately shrink the viewport. */
function isStandalone() {
  return navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
}
function syncShellHeight() {
  if (!isStandalone()) {
    document.documentElement.style.removeProperty('--mf-shell-h');
    return;
  }
  const vv = window.visualViewport;
  const h = Math.max((vv && vv.height) || 0, window.innerHeight || 0);
  if (h) document.documentElement.style.setProperty('--mf-shell-h', `${Math.round(h)}px`);
}
syncShellHeight();
// The misreported viewport often corrects itself shortly after launch — re-measure.
setTimeout(syncShellHeight, 300);
setTimeout(syncShellHeight, 1000);
window.addEventListener('resize', syncShellHeight, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(syncShellHeight, 250), { passive: true });
window.addEventListener('pageshow', syncShellHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncShellHeight, { passive: true });
}

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
