import { expect, test } from '@playwright/test';
import { ouvrirProfil } from './helpers';

test('démarre une séance et ouvre la fiche du mouvement', async ({ page }) => {
  await ouvrirProfil(page);

  await page
    .getByRole('button', { name: /Commencer/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Comment te sens-tu/ })).toBeVisible();
  await page.getByRole('button', { name: 'Passer l’ajustement' }).click();

  await expect(page.getByRole('button', { name: 'Plus d’options' })).toBeVisible();
  await page.getByRole('button', { name: 'Plus d’options' }).click();
  await page.getByRole('button', { name: 'Fiche du mouvement' }).click();

  await expect(page.getByText('FICHE MOUVEMENT')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voir la technique' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByText('FICHE MOUVEMENT')).toBeHidden();
});
