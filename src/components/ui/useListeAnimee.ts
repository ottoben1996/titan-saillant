import autoAnimate from '@formkit/auto-animate';
import { type RefCallback, useCallback } from 'react';

/**
 * Anime l'apparition et la disparition des éléments d'une liste.
 *
 * Une ligne d'historique supprimée qui disparaît d'un coup laisse un doute :
 * a-t-on appuyé au bon endroit ? Trois kilo-octets suffisent pour que la liste
 * se replace sous le doigt, et pour que l'œil suive.
 *
 * Le mouvement est désactivé si la personne a demandé à réduire les animations :
 * `auto-animate` respecte `prefers-reduced-motion` par défaut.
 */
export function useListeAnimee(): RefCallback<HTMLElement> {
  return useCallback((element: HTMLElement | null) => {
    if (element) autoAnimate(element);
  }, []);
}
