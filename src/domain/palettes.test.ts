import { describe, expect, it } from 'vitest';
import { accentDe, accentIds, accentParDefaut, accents, contraste, estAccent } from './palettes';

/** Fond sombre de l'application : la couleur doit ressortir dessus. */
const FOND = '#101615';

describe('couleurs proposées', () => {
  it('en propose cinq, vert, rose, bleu, ambre et turquoise', () => {
    expect(accents).toHaveLength(5);
    expect(accentIds).toEqual(['vert', 'rose', 'bleu', 'ambre', 'turquoise']);
    expect(accents.map((accent) => accent.label)).toEqual(['Vert', 'Rose', 'Bleu', 'Ambre', 'Turquoise']);
  });

  it('chacune est unique', () => {
    expect(new Set(accents.map((accent) => accent.id)).size).toBe(5);
    expect(new Set(accents.map((accent) => accent.accent)).size).toBe(5);
  });

  it('garde le texte lisible sur la couleur : seuil AAA de 7:1 dépassé', () => {
    for (const accent of accents) {
      // L'encre est posée sur la couleur : c'est le cas des boutons pleins.
      expect(contraste(accent.ink, accent.accent), `${accent.label} encre/couleur`).toBeGreaterThanOrEqual(7);
      // La couleur est posée sur le fond sombre : c'est le cas des chiffres forts.
      expect(contraste(accent.accent, FOND), `${accent.label} couleur/fond`).toBeGreaterThanOrEqual(7);
      // La teinte sombre sert de fond de carte : l'encre claire doit y tenir.
      expect(contraste(accent.accent, accent.accent3), `${accent.label} couleur/teinte`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('démarre sur le vert pour Ottman et le rose pour Laura', () => {
    expect(accentDe(undefined, 'ottman').id).toBe('vert');
    expect(accentDe(undefined, 'laura').id).toBe('rose');
    expect(accentParDefaut).toEqual({ ottman: 'vert', laura: 'rose' });
  });

  it('retombe sur la couleur du profil si le choix est inconnu', () => {
    expect(accentDe('bleu', 'laura').id).toBe('bleu');
    // Une valeur abîmée dans le stockage ne doit pas casser l'affichage.
    expect(accentDe('fuchsia' as never, 'laura').id).toBe('rose');
    expect(accentDe(undefined, 'ottman').accent).toBe('#B8F36B');
  });

  it('reconnaît ses propres identifiants, et rien d’autre', () => {
    expect(estAccent('ambre')).toBe(true);
    expect(estAccent('fuchsia')).toBe(false);
    expect(estAccent(null)).toBe(false);
    expect(estAccent(7)).toBe(false);
  });
});
