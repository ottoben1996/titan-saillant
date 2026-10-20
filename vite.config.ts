import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => ({
  // GitHub Pages sert le site sous /<depot>/. Le build doit donc produire ces
  // chemins par défaut ; le serveur local reste, lui, servi depuis la racine.
  // VITE_BASE garde la possibilité de cibler explicitement un autre hébergement.
  base: process.env.VITE_BASE ?? (command === 'build' ? '/titan-saillant/' : '/'),
  // Version injectée au build : affichée dans Réglages pour vérifier d'un coup
  // d'œil quelle version tourne réellement sur l'appareil.
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    // Les specs Playwright vivent dans e2e/ et se lancent par `npm run e2e` :
    // Vitest ne doit pas tenter de les importer dans jsdom.
    include: ['src/**/*.test.{ts,tsx}'],
    // L'environnement de navigateur simulé coûtait 70 % du temps de la suite :
    // un par fichier. Ce banc le partage par groupe de tests.
    pool: 'vmThreads',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      // Le plancher est posé juste sous le niveau réellement atteint : il ne
      // bloque rien aujourd'hui, mais toute baisse silencieuse devient visible.
      thresholds: {
        statements: 62,
        branches: 56,
        functions: 54,
        lines: 68,
      },
      // Les fichiers de test, les styles et les déclarations de types ne se mesurent pas.
      exclude: ['src/**/*.test.*', 'src/styles/**', 'src/vite-env.d.ts', 'src/test/**'],
    },
  },
}));
