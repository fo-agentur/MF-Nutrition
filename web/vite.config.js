import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Sichtbare Build-Kennung (Mehr-Tab): auf Vercel kommt der Commit aus der Env,
// lokal aus git; ohne beides bleibt 'dev'.
function buildId() {
  const vercelSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  if (vercelSha) return vercelSha;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return 'dev';
  }
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'maskable-512.png'],
      manifest: {
        name: 'MacroFactor',
        short_name: 'MacroFactor',
        description: 'Nutrition & macro tracking',
        lang: 'de',
        id: '/',
        start_url: '/?pwa=1',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'portrait',
        background_color: '#1A1A1A',
        theme_color: '#1A1A1A',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,png,svg,woff2,woff,ttf}'],
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/api/],
        importScripts: ['sw-force-update.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
});
