/**
 * Relevé du défilement.
 *
 * La barre du haut se pose, le grand titre s'efface : tout cela est du CSS,
 * piloté par un attribut sur la racine du document. Si ce relevé cesse de
 * fonctionner, rien ne casse — l'écran reste simplement figé sur l'état du
 * haut de page, ce qui ne se voit qu'à l'usage. D'où ce test.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEnTeteReplie } from './useEnTeteReplie';

function defiler(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  window.dispatchEvent(new Event('scroll'));
}

afterEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  delete document.documentElement.dataset.replie;
});

describe('état de l’en-tête au défilement', () => {
  it('part non replié, la barre transparente', () => {
    renderHook(() => useEnTeteReplie());

    expect(document.documentElement.dataset.replie).toBe('false');
  });

  it('se replie au-delà du seuil, et revient en haut', () => {
    renderHook(() => useEnTeteReplie());

    defiler(240);
    expect(document.documentElement.dataset.replie).toBe('true');

    defiler(0);
    expect(document.documentElement.dataset.replie).toBe('false');
  });

  it('ne se déclenche pas pour un tremblement de quelques pixels', () => {
    renderHook(() => useEnTeteReplie());

    defiler(4);
    expect(document.documentElement.dataset.replie).toBe('false');
  });

  it('retire l’attribut en partant, pour ne pas le laisser traîner', () => {
    const { unmount } = renderHook(() => useEnTeteReplie());
    defiler(300);
    expect(document.documentElement.dataset.replie).toBe('true');

    unmount();
    expect(document.documentElement.dataset.replie).toBeUndefined();
  });

  it('se replie aussi quand c’est un conteneur qui défile, pas la fenêtre', () => {
    renderHook(() => useEnTeteReplie());

    // Pendant une séance, c'est `.workout-content` qui défile : la fenêtre reste à
    // zéro et l'en-tête ne se repliait donc JAMAIS en salle. L'événement `scroll`
    // ne remonte pas — mais il se capture : l'écoute est posée en phase de capture
    // depuis `window`, et ce test l'exige (`bubbles: false`).
    const conteneur = document.createElement('div');
    Object.defineProperty(conteneur, 'scrollTop', { value: 180, configurable: true });
    document.body.append(conteneur);

    conteneur.dispatchEvent(new Event('scroll', { bubbles: false }));

    expect(document.documentElement.dataset.replie).toBe('true');
    conteneur.remove();
  });
});
