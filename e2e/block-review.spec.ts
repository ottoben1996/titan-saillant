import { expect, test } from '@playwright/test';
import { allerA, importerSauvegarde, ouvrirProfil, sauvegardeAvecHistorique } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'print', {
      configurable: true,
      value: () => {
        (window as unknown as { __printCalled: boolean }).__printCalled = true;
      },
    });
  });
});

test('ouvre une fiche de mouvement et la revue des huit semaines', async ({ page }) => {
  await ouvrirProfil(page);
  await importerSauvegarde(page, sauvegardeAvecHistorique());

  await allerA(page, 'Progrès');
  await expect(page.getByRole('heading', { level: 1, name: 'Progrès' })).toBeVisible();

  await page.getByRole('button', { name: /Voir la fiche de Développé couché barre/i }).click();
  await expect(page.getByText('FICHE MOUVEMENT')).toBeVisible();
  await expect(page.getByText('70 kg').first()).toBeVisible();
  await expect(page.getByRole('img', { name: /Charge la plus lourde à chaque passage/i })).toBeVisible();
  await page.getByRole('button', { name: 'Voir la technique' }).click();
  await expect(page.getByText('TUTORIEL & ANATOMIE')).toBeVisible();
  await page.getByRole('button', { name: 'Retour à la fiche' }).click();
  await expect(page.getByText('FICHE MOUVEMENT')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();

  await page.getByRole('button', { name: /Revue des 8 dernières semaines/i }).click();
  await expect(page.getByRole('heading', { name: 'Revue de bloc' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Volume par zone' })).toBeVisible();
  await expect(page.getByText('Meilleures charges du bloc')).toBeVisible();
  await expect(page.getByRole('table').filter({ hasText: 'Développé couché barre' }).first()).toBeVisible();
  await expect(page.getByText('Mensurations')).toBeVisible();

  await page.getByRole('button', { name: /Exporter en PDF/ }).click();
  expect(await page.evaluate(() => (window as unknown as { __printCalled: boolean }).__printCalled)).toBe(true);
});

test('affiche le bilan hebdomadaire du point importé', async ({ page }) => {
  await ouvrirProfil(page);
  await importerSauvegarde(page, sauvegardeAvecHistorique());

  await allerA(page, 'Progrès');
  await page.getByRole('radio', { name: 'Points' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Progrès' })).toBeVisible();

  await page.getByRole('button', { name: 'Voir le bilan de la semaine 1' }).click();
  await expect(page.getByRole('heading', { name: 'Bilan hebdomadaire' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Exporter en PDF/ })).toBeVisible();
});
