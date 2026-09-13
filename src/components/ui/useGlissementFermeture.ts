import { useCallback, useRef, useState } from 'react';

interface GlissementFermeture {
  /** À poser sur la poignée de la feuille. */
  handleProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  };
  /** Décalage vertical à appliquer à la feuille pendant le geste, en pixels. */
  decalage: number;
  /** Vrai pendant le geste, pour couper la transition. */
  enCours: boolean;
}

/** Distance au-delà de laquelle relâcher ferme la feuille. */
const SEUIL = 90;
/** Au-delà, la feuille suit le doigt au ralenti : elle résiste. */
const FREIN = 0.55;
/** Vitesse minimale qui ferme, même sur un geste court. */
const VITESSE = 0.6;

/**
 * Fermeture d'une feuille par glissement vers le bas.
 *
 * C'est le geste qu'on essaie d'instinct sur un panneau qui monte du bas. Ne pas
 * y répondre donne l'impression d'une interface qui ignore ce qu'on fait, mais
 * installer une bibliothèque entière pour l'obtenir coûtait plus cher que de
 * l'écrire : la feuille existante gère déjà le focus, le verrouillage du
 * défilement et la fermeture au clavier, et on ne remplace pas cela à la légère.
 *
 * Le geste se mesure sur la poignée uniquement : glisser au milieu d'une liste
 * doit faire défiler la liste, pas fermer la feuille.
 */
export function useGlissementFermeture(onClose: () => void): GlissementFermeture {
  const [decalage, setDecalage] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const depart = useRef<{ y: number; temps: number } | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    // Le geste capte le pointeur : sans cela, un mouvement rapide sort de la
    // poignée et la feuille reste à mi-chemin.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    depart.current = { y: event.clientY, temps: performance.now() };
    setEnCours(true);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!depart.current) return;
    const brut = event.clientY - depart.current.y;
    if (brut <= 0) {
      // Vers le haut : un dixième de la course, et rien de plus. La feuille
      // paraît lourde, ce qui est exactement l'impression voulue.
      setDecalage(Math.max(-24, brut * 0.1));
      return;
    }
    setDecalage(brut < SEUIL ? brut : SEUIL + (brut - SEUIL) * FREIN);
  }, []);

  const terminer = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!depart.current) return;
      const parcouru = event.clientY - depart.current.y;
      const duree = Math.max(1, performance.now() - depart.current.temps);
      const vitesse = parcouru / duree;
      depart.current = null;
      setEnCours(false);
      setDecalage(0);
      if (parcouru > SEUIL || (parcouru > 24 && vitesse > VITESSE)) onClose();
    },
    [onClose],
  );

  return {
    handleProps: { onPointerDown, onPointerMove, onPointerUp: terminer, onPointerCancel: terminer },
    decalage,
    enCours,
  };
}
