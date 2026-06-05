/* Must be imported BEFORE the ported prototype modules.
   They reference a global `React` (and window.lucide) at eval/runtime. */
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { createIcons, icons } from 'lucide';

window.React = React;
window.ReactDOM = ReactDOMClient;
window.lucide = { createIcons: (opts = {}) => createIcons({ icons, ...opts }) };

function syncAppViewportHeight() {
  const visual = window.visualViewport && window.visualViewport.height;
  const h = Math.max(window.innerHeight || 0, visual || 0);
  if (h) document.documentElement.style.setProperty('--mf-app-height', `${h}px`);
}

syncAppViewportHeight();
window.addEventListener('resize', syncAppViewportHeight, { passive: true });
window.addEventListener('orientationchange', syncAppViewportHeight, { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncAppViewportHeight, { passive: true });
  window.visualViewport.addEventListener('scroll', syncAppViewportHeight, { passive: true });
}
