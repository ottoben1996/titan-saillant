import { expect, test } from '@playwright/test';
import { allerA, ouvrirProfil } from './helpers';

test('exporte la sauvegarde puis la restaure par le même écran', async ({ page }) => {
  await ouvrirProfil(page);
  await allerA(page, 'Profil');

  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exporter mes données/i }).click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename()).toMatch(/\.json$/i);

  const chemin = await fichier.path();
  expect(chemin).not.toBeNull();
  await page.locator('input[type=file]').setInputFiles(chemin as string);
  await expect(page.getByRole('alertdialog', { name: 'Confirmation de la restauration' })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurer', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sauvegarde importée.' })).toBeVisible();
});
