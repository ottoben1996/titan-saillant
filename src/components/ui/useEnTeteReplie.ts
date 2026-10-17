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

    /**
     * Le défilement se lit sur l'élément qui a effectivement défilé.
     *
     * Pendant une séance, c'est `.workout-content` qui défile — pas la fenêtre :
     * `window.scrollY` restait donc à zéro et l'en-tête ne se repliait JAMAIS en
     * salle, laissant la barre du haut transparente au-dessus du contenu qu'elle
     * est censée couvrir. Le `scroll` ne remonte pas, mais il se capture : une
     * écoute en phase de capture depuis `window` attrape le défilement de
     * n'importe quel conteneur, sans avoir à en connaître la liste.
     */
    const lire = (evenement?: Event) => {
      const cible = evenement?.target;
      const conteneur = cible instanceof HTMLElement ? cible : null;
      const defile = Math.max(window.scrollY, conteneur?.scrollTop ?? 0);
      racine.dataset.replie = defile > seuil ? 'true' : 'false';
    };

    lire();
    window.addEventListener('scroll', lire, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', lire, { capture: true });
      delete racine.dataset.replie;
    };
  }, [seuil]);
}
