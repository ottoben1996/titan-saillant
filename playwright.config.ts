import { defineConfig, devices } from '@playwright/test';

/**
 * E2E du parcours réel : un profil, une séance, un bilan, une sauvegarde.
 *
 * Le serveur est le build de production, servi sous le même sous-chemin que
 * GitHub Pages. Tester `vite dev` laisserait passer les erreurs de base d'URL et
 * de service worker, c'est-à-dire précisément ce qui casse en ligne.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/titan-saillant/',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node e2e/server.mjs',
    url: 'http://127.0.0.1:4173/titan-saillant/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
