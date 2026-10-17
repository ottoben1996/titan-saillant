import { afterEach, describe, expect, it } from 'vitest';
import { enregistrerModeSaisieRapide, lireModeSaisieRapide } from './quickLogPreference';

afterEach(() => localStorage.clear());

describe('mode mains occupées', () => {
  it('est désactivé par défaut et se conserve par profil', () => {
    expect(lireModeSaisieRapide('ottman')).toBe(false);
    enregistrerModeSaisieRapide('ottman', true);
    expect(lireModeSaisieRapide('ottman')).toBe(true);
    expect(lireModeSaisieRapide('laura')).toBe(false);
  });
});
