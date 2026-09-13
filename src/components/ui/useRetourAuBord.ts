import { useCallback, useRef, useState } from 'react';

interface Options {
  /** Vrai quand il y a un écran derrière : à la racine, le geste n'existe pas. */
  actif: boolean;
  /** Ce que fait le retour — le même que le bouton de la barre du haut. */
  onRetour: () => void;
}

/** Zone, en pixels depuis le bord gauche, où le geste peut commencer. */
const BORD = 28;

/** Part de la largeur au-delà de laquelle relâcher déclenche le retour. */
const SEUIL = 0.35;

/**
 * Retour au glissement depuis le bord gauche.
 *
 * C'est le geste qu'on tente d'instinct pour revenir en arrière, et son absence
 * se remarque plus que sa présence. La page suit le doigt, puis revient au
 * ressort.
 *
 * Deux garde-fous, appris à l'usage :
 *
 *  - le geste ne s'engage qu'après une intention franchement horizontale. Sans
 *    cela, un défilement vertical démarré près du bord fait glisser la page de
 *    travers.
 *  - il ne fait que *déclencher* le retour, il ne le joue pas : la sortie d'une
 *    séance passe par une confirmation, et faire disparaître l'écran avant la
 *    réponse laisserait l'application dans un état intermédiaire.
 */
export function useRetourAuBord({ actif, onRetour }: Options) {
  const [decalage, setDecalage] = useState(0);
  const geste = useRef<{ x: number; y: number; engage: boolean; largeur: number } | null>(null);

  const onPointerDown = useCallback(
    (evenement: React.PointerEvent<HTMLElement>) => {
      if (!actif) return;
      const zone = evenement.currentTarget.getBoundingClientRect();
      if (evenement.clientX - zone.left > BORD) return;
      geste.current = { x: evenement.clientX, y: evenement.clientY, engage: false, largeur: zone.width };
    },
    [actif],
  );

  const onPointerMove = useCallback((evenement: React.PointerEvent<HTMLElement>) => {
    const suivi = geste.current;
    if (!suivi) return;

    const dx = evenement.clientX - suivi.x;
    const dy = evenement.clientY - suivi.y;

    if (!suivi.engage) {
      // On attend une intention horizontale nette. En dessous, c'est un
      // défilement : on abandonne sans jamais avoir bougé l'écran.
      if (Math.abs(dy) > Math.abs(dx)) {
        geste.current = null;
        return;
      }
      if (Math.abs(dx) < 8) return;
      suivi.engage = true;
      evenement.currentTarget.setPointerCapture?.(evenement.pointerId);
    }

    const parcouru = Math.max(0, dx);
    const limite = suivi.largeur * SEUIL;
    // Au-delà du seuil la page résiste : on sent qu'on a assez tiré.
    setDecalage(parcouru < limite ? parcouru : limite + (parcouru - limite) * 0.35);
  }, []);

  const terminer = useCallback(
    (evenement: React.PointerEvent<HTMLElement>) => {
      const suivi = geste.current;
      geste.current = null;
      setDecalage(0);
      if (!suivi?.engage) return;
      if (evenement.clientX - suivi.x > suivi.largeur * SEUIL) onRetour();
    },
    [onRetour],
  );

  return {
    decalage,
    props: {
      onPointerDown,
      onPointerMove,
      onPointerUp: terminer,
      onPointerCancel: terminer,
    },
  };
}
