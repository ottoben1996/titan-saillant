/**
 * Sonde de fluidité.
 *
 * Ce qui se vérifie ici n'est pas la mesure elle-même — elle dépend de la
 * machine — mais ses deux bords :
 *
 *  1. une mesure inexploitable ne doit JAMAIS retirer la matière à un appareil
 *     qui la supporte. C'est la règle qui protège du faux positif : sur un
 *     téléphone sain, un verdict « bridé » coûterait la translucidité pour rien ;
 *  2. les premières images ne comptent pas. Le démarrage à froid d'une
 *     application de 500 Ko n'est pas représentatif de ce qui suit — sans quoi
 *     tout appareil paraîtrait lent une fois, au lancement.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DELAI_AVANT_MESURE,
  IMAGES_IGNOREES,
  mesurerEtPoserFluidite,
  mesurerFluidite,
  poserVerdictFluidite,
  SEUIL_FLUIDITE,
  surveillerLaFluidite,
  verdictFluidite,
} from './fluidite';

/**
 * Boucle d'images simulée : rejoue les écarts fournis, puis répète le dernier.
 * Une image réelle arrive par le navigateur ; ici, c'est un tableau.
 */
function cadenceur(ecarts: number[], maximum = 400) {
  let index = 0;
  let instant = 0;
  let images = 0;
  return (retour: (instant: number) => void) => {
    if (images >= maximum) return;
    images += 1;
    instant += ecarts[Math.min(index, ecarts.length - 1)];
    index += 1;
    retour(instant);
  };
}

const SOIXANTE = 1000 / 60;
const TRENTE = 1000 / 30;

describe('verdict de fluidité', () => {
  it('garde la matière sur un appareil sain', () => {
    expect(verdictFluidite(60)).toBe('haut');
    expect(verdictFluidite(58.7)).toBe('haut');
  });

  it('la retire sur un appareil bridé — 30 fps est le plafond d’iOS en économie d’énergie', () => {
    expect(verdictFluidite(30)).toBe('bas');
    expect(verdictFluidite(29.9)).toBe('bas');
  });

  it('le seuil lui-même reste du côté sain', () => {
    expect(verdictFluidite(SEUIL_FLUIDITE)).toBe('haut');
    expect(verdictFluidite(SEUIL_FLUIDITE - 0.1)).toBe('bas');
  });

  it('ne dégrade jamais rien sur une mesure inexploitable', () => {
    // Une division ratée, un zéro image, un onglet qui n'a rien peint : dans le
    // doute, l'appareil est traité comme sain. Retirer la matière à tort est un
    // défaut visible ; la garder à tort n'en est pas un.
    for (const mesure of [Number.NaN, Number.POSITIVE_INFINITY, 0, -12]) {
      expect(verdictFluidite(mesure), String(mesure)).toBe('haut');
    }
  });
});

describe('mesure de la cadence', () => {
  it('compte une cadence saine', async () => {
    const imagesParSeconde = await mesurerFluidite(cadenceur([SOIXANTE]), 900);
    expect(imagesParSeconde).toBeGreaterThan(58);
    expect(imagesParSeconde).toBeLessThan(62);
  });

  it('compte une cadence bridée', async () => {
    const imagesParSeconde = await mesurerFluidite(cadenceur([TRENTE]), 900);
    expect(imagesParSeconde).toBeGreaterThan(28);
    expect(imagesParSeconde).toBeLessThan(32);
  });

  it('ignore les premières images d’un démarrage à froid', async () => {
    // Six images très espacées (le chargement), puis une cadence saine : le
    // verdict doit être celui de la cadence, pas celui du lancement.
    const demarrage = Array.from({ length: IMAGES_IGNOREES }, () => 500);
    const imagesParSeconde = await mesurerFluidite(cadenceur([...demarrage, SOIXANTE]), 900);

    expect(imagesParSeconde).toBeGreaterThan(50);
    expect(verdictFluidite(imagesParSeconde)).toBe('haut');
  });
});

describe('pose du verdict', () => {
  afterEach(() => {
    delete document.documentElement.dataset.perf;
    vi.useRealTimers();
  });

  it('écrit l’état sur la racine, pas dans un état React', () => {
    // Un attribut sur `<html>` : le CSS décide seul, aucun rendu n'est déclenché.
    poserVerdictFluidite('bas');
    expect(document.documentElement.dataset.perf).toBe('bas');

    poserVerdictFluidite('haut');
    expect(document.documentElement.dataset.perf).toBe('haut');
  });

  it('mesure puis pose, sans navigateur', async () => {
    const verdict = await mesurerEtPoserFluidite(document.documentElement, cadenceur([TRENTE]));
    expect(verdict).toBe('bas');
    expect(document.documentElement.dataset.perf).toBe('bas');
  });

  it('attend que l’application soit posée avant de mesurer', async () => {
    vi.useFakeTimers();
    const arreter = surveillerLaFluidite(document.documentElement, cadenceur([TRENTE]));

    // Rien n'est mesuré pendant le délai : une transition d'écran n'est pas un bridage.
    await vi.advanceTimersByTimeAsync(DELAI_AVANT_MESURE - 1);
    expect(document.documentElement.dataset.perf).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(document.documentElement.dataset.perf).toBe('bas');

    arreter();
  });
});
