/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Club de Lectura · Votación',
        short_name: 'Bookclub',
        description: 'Elige el próximo libro del club por rondas de votación anónima.',
        lang: 'es',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#120c10',
        theme_color: '#120c10',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('books.google') ||
              url.hostname.includes('googleusercontent') ||
              url.hostname === 'covers.openlibrary.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
