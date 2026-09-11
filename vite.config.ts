import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest,woff2}'],
        // Les bibliothèques d'images lourdes de l'espace MUSTAPHA ne sont pas
        // précachées : elles sont mises en cache à la première utilisation.
        globIgnores: ['**/mustapha/assets/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/mustapha\/assets\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mustapha-assets',
              expiration: { maxEntries: 400, maxAgeSeconds: 5184000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
