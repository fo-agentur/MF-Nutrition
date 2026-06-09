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
