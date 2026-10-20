import { expect, type Page } from '@playwright/test';

export const BASE = '/titan-saillant/';

/** Ouvre l'application et choisit un profil, comme au premier lancement. */
export async function ouvrirProfil(page: Page, nom: 'Ottman' | 'Laura' = 'Ottman') {
  // Le service worker prend la main au premier chargement et recharge la page :
  // le test perdrait le clic en cours. On le neutralise ; la bannière de mise à
  // jour est déclenchée par événement dans son propre test.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: () => new Promise(() => undefined),
        ready: new Promise(() => undefined),
        controller: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
  });

  await page.goto(BASE);
  await page
    .getByRole('button', { name: new RegExp(nom, 'i') })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Aujourd’hui' })).toBeVisible();
}

/** Navigue par la barre du bas, seule navigation persistante. */
export async function allerA(page: Page, onglet: 'Aujourd’hui' | 'Progrès' | 'Profil') {
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: onglet }).click();
}

export interface SauvegardeFactice {
  version: number;
  profileId: 'ottman' | 'laura';
  exportedAt: string;
  sessions: unknown[];
  preferences: unknown[];
  measurements: unknown[];
}

const ilYa = (jours: number) => new Date(Date.now() - jours * 86_400_000).toISOString();

/**
 * Une sauvegarde valide, avec trois séances récentes et un point de suivi.
 *
 * Les charges montent de 60 à 70 kg : la revue de bloc doit pouvoir montrer une
 * progression réelle, pas un jeu de données qui ne raconte rien.
 */
export function sauvegardeAvecHistorique(): SauvegardeFactice {
  const seance = (id: string, jours: number, charge: number) => {
    const at = ilYa(jours);
    return {
      id,
      profileId: 'ottman',
      dayId: 'full-body-a',
      startedAt: at,
      updatedAt: at,
      completedAt: at,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      loggedSets: [0, 1, 2].map((setIndex) => ({
        exerciseId: 'developpe-couche-barre',
        setIndex,
        actualLoadKg: charge,
        actualRepetitions: 12,
        completedAt: at,
      })),
      perceivedExertion: 7,
      energy: 3,
      pain: 'aucune',
    };
  };

  return {
    version: 3,
    profileId: 'ottman',
    exportedAt: ilYa(0),
    sessions: [seance('e2e-seance-1', 26, 60), seance('e2e-seance-2', 12, 65), seance('e2e-seance-3', 4, 70)],
    preferences: [],
    measurements: [
      {
        id: 'ottman-c1-s1',
        profileId: 'ottman',
        cycle: 1,
        week: 1,
        measuredOn: ilYa(9),
        weightKg: 92.4,
        waistCm: 88,
      },
      {
        id: 'ottman-c1-s2',
        profileId: 'ottman',
        cycle: 1,
        week: 2,
        measuredOn: ilYa(2),
        weightKg: 91.2,
        waistCm: 87,
      },
    ],
  };
}

/** Restaure un fichier par l'écran Profil, en passant par la confirmation. */
export async function importerSauvegarde(page: Page, contenu: unknown) {
  await allerA(page, 'Profil');
  await page.locator('input[type=file]').setInputFiles({
    name: 'sauvegarde-e2e.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(contenu)),
  });
  await expect(page.getByRole('alertdialog', { name: 'Confirmation de la restauration' })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurer', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sauvegarde importée.' })).toBeVisible();
}
