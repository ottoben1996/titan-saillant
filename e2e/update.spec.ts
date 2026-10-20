import { expect, test } from '@playwright/test';
import { ouvrirProfil } from './helpers';

test('annonce une version prête sans interrompre la séance', async ({ page }) => {
  await ouvrirProfil(page);

  await page.evaluate(() => window.dispatchEvent(new Event('coach-update-pending')));

  const banniere = page.getByRole('status').filter({ hasText: 'Une version plus récente est prête.' });
  await expect(banniere).toBeVisible();
  await expect(banniere.getByRole('button', { name: 'Mettre à jour' })).toBeVisible();
});
