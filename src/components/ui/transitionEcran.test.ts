/**
 * Sens du passage entre écrans.
 *
 * Trois passages pour trois significations : entrer dans un écran vient de la
 * droite, en sortir revient de la gauche, changer d'onglet commute net. Se
 * tromper de sens se voit immédiatement — l'écran arrive du mauvais côté.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Screen } from '../layout/BottomNav';
import { sensDuChangement, useSensEcran } from './transitionEcran';

describe('sens du passage', () => {
  it('fait venir un écran ouvert depuis la droite', () => {
    expect(sensDuChangement('home', 'workout')).toBe('pousse');
    expect(sensDuChangement('progression', 'followup')).toBe('pousse');
    expect(sensDuChangement('followup', 'bilan')).toBe('pousse');
  });

  it('ramène un écran quitté depuis la gauche', () => {
    expect(sensDuChangement('workout', 'home')).toBe('revient');
    expect(sensDuChangement('bilan', 'followup')).toBe('revient');
    expect(sensDuChangement('bilan', 'progression')).toBe('revient');
  });

  it('commute net entre les quatre onglets', () => {
    const onglets: Screen[] = ['home', 'history', 'progression', 'settings'];
    for (const avant of onglets) {
      for (const apres of onglets) {
        if (avant === apres) continue;
        expect(sensDuChangement(avant, apres), `${avant} → ${apres}`).toBe('onglet');
      }
    }
  });

  it('n’invente pas de glissement quand rien ne change', () => {
    expect(sensDuChangement('home', 'home')).toBe('onglet');
  });
});

describe('sens pendant la vie du composant', () => {
  it('suit les changements d’écran', () => {
    const { result, rerender } = renderHook(({ ecran }: { ecran: Screen }) => useSensEcran(ecran), {
      initialProps: { ecran: 'home' as Screen },
    });

    expect(result.current).toBe('onglet');

    rerender({ ecran: 'workout' });
    expect(result.current).toBe('pousse');

    rerender({ ecran: 'home' });
    expect(result.current).toBe('revient');

    rerender({ ecran: 'progression' });
    expect(result.current).toBe('onglet');
  });

  it('ne confond pas un changement d’onglet avec une entrée', () => {
    const { result, rerender } = renderHook(({ ecran }: { ecran: Screen }) => useSensEcran(ecran), {
      initialProps: { ecran: 'home' as Screen },
    });

    rerender({ ecran: 'settings' });
    expect(result.current).toBe('onglet');
  });
});
