import { useEffect } from 'react';

/** Au-delà, l'en-tête est considéré comme replié. */
const SEUIL = 12;

/**
 * Pose l'état de défilement sur la racine du document.
 *
 * Tout le reste est du CSS : la barre du haut se pose, le grand titre s'efface,
 * le titre de la barre apparaît. Passer par un attribut sur `<html>` plutôt que
 * par un état React évite un rendu par image de défilement — sur un téléphone,
 * c'est la différence entre une barre fluide et une barre qui saccade.
 *
 * L'écoute est `passive` : le navigateur n'attend pas notre réponse pour faire
 * défiler la page.
 */
export function useEnTeteReplie(seuil: number = SEUIL): void {
  useEffect(() => {
    const racine = document.documentElement;

    const lire = () => {
      racine.dataset.replie = window.scrollY > seuil ? 'true' : 'false';
    };

    lire();
    window.addEventListener('scroll', lire, { passive: true });
    return () => {
      window.removeEventListener('scroll', lire);
      delete racine.dataset.replie;
    };
  }, [seuil]);
}
