import { afterEach, describe, expect, it, vi } from 'vitest';
import { enregistrerAccent, lireAccent } from './accentPreference';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('couleur choisie', () => {
  it('démarre sur la couleur du profil quand rien n’a été choisi', () => {
    expect(lireAccent('ottman')).toBe('vert');
    expect(lireAccent('laura')).toBe('rose');
  });

  it('relit le choix enregistré', () => {
    enregistrerAccent('laura', 'turquoise');
    expect(lireAccent('laura')).toBe('turquoise');
  });

  it('garde un choix par profil : celui de Laura ne touche pas Ottman', () => {
    enregistrerAccent('ottman', 'bleu');
    enregistrerAccent('laura', 'ambre');
    expect(lireAccent('ottman')).toBe('bleu');
    expect(lireAccent('laura')).toBe('ambre');
  });

  it('ignore une valeur abîmée et revient à la couleur du profil', () => {
    localStorage.setItem('coach-accent-ottman', 'fuchsia');
    expect(lireAccent('ottman')).toBe('vert');
  });

  it('reste utilisable si le stockage refuse d’écrire ou de lire', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('stockage refusé');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('stockage refusé');
    });
    expect(lireAccent('laura')).toBe('rose');
    expect(() => enregistrerAccent('laura', 'bleu')).not.toThrow();
  });
});
