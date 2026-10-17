import { beforeEach, describe, expect, it } from 'vitest';
import { enregistrerErreur, journalEnTexte, lireErreurs, viderErreurs } from './journalErreurs';

beforeEach(() => localStorage.clear());

describe('journal des erreurs', () => {
  it('est vide au départ', () => {
    expect(lireErreurs()).toEqual([]);
    expect(journalEnTexte([])).toBe('Aucune erreur enregistrée.');
  });

  it('conserve la plus récente en tête, avec son origine', () => {
    enregistrerErreur('première', 'accueil');
    enregistrerErreur('deuxième', 'séance', 'laura');

    const journal = lireErreurs();
    expect(journal).toHaveLength(2);
    expect(journal[0].message).toBe('deuxième');
    expect(journal[0].origine).toBe('séance');
    expect(journal[0].profil).toBe('laura');
  });

  it('borne le journal : vingt entrées, pas plus', () => {
    for (let index = 0; index < 30; index += 1) enregistrerErreur(`erreur ${index}`, 'test');

    const journal = lireErreurs();
    expect(journal).toHaveLength(20);
    expect(journal[0].message).toBe('erreur 29');
  });

  it('tronque un message interminable plutôt que de remplir le stockage', () => {
    enregistrerErreur('x'.repeat(5000), 'test');

    expect(lireErreurs()[0].message).toHaveLength(300);
  });

  it('se vide sur demande', () => {
    enregistrerErreur('une erreur', 'test');
    viderErreurs();

    expect(lireErreurs()).toEqual([]);
  });

  it('résiste à un contenu abîmé dans le stockage', () => {
    localStorage.setItem('coach-journal-erreurs', 'pas du json');
    expect(lireErreurs()).toEqual([]);

    localStorage.setItem('coach-journal-erreurs', '{"pas": "un tableau"}');
    expect(lireErreurs()).toEqual([]);
  });

  it('produit un texte lisible, daté et attribué', () => {
    enregistrerErreur('Erreur de rendu', 'Écran du bilan', 'ottman');
    const texte = journalEnTexte(lireErreurs());

    expect(texte).toContain('Écran du bilan');
    expect(texte).toContain('Erreur de rendu');
    expect(texte).toContain('ottman');
    expect(texte).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
