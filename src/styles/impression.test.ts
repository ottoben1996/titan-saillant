/**
 * Règles d'impression du bilan.
 *
 * Ces tests figent trois défauts réellement survenus, invisibles à l'œil sur
 * l'écran et découverts seulement en générant un PDF :
 *
 *  1. une règle `@page` placée DANS un bloc `@media print` est ignorée par le
 *     navigateur — le PDF sortait au format US et la dernière colonne du tableau
 *     était coupée ;
 *  2. le fond sombre de l'application n'était pas neutralisé, si bien que les
 *     chiffres dépassant d'un cheveu du cadre blanc tombaient sur du noir ;
 *  3. la barre du haut et la navigation s'imprimaient avec le document.
 *
 * La vérification approfondie — PDF réellement produit, format et marges
 * mesurés — reste `tools/print-bilan.mjs`, qui exige un navigateur.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Lu depuis la racine du projet (le répertoire de travail de la suite) : en
// environnement de navigateur simulé, `import.meta.url` n'est pas un chemin.
const css = readFileSync('src/styles/followup.css', 'utf8');

/** Contenu d'un bloc `@media print { … }`, accolades équilibrées. */
function blocImpression(source: string): string {
  const debut = source.indexOf('@media print {');
  expect(debut, 'aucun bloc @media print').toBeGreaterThan(-1);
  let profondeur = 0;
  let index = source.indexOf('{', debut);
  const ouverture = index;
  for (; index < source.length; index += 1) {
    if (source[index] === '{') profondeur += 1;
    if (source[index] === '}') {
      profondeur -= 1;
      if (profondeur === 0) return source.slice(ouverture, index + 1);
    }
  }
  throw new Error('bloc @media print non fermé');
}

describe('règles d’impression du bilan', () => {
  it('déclare le format hors du bloc @media print', () => {
    const impression = blocImpression(css);

    // Le piège : dans @media print, la règle est ignorée en silence.
    expect(impression).not.toContain('@page');
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4/);
    expect(css).toMatch(/@page\s*\{[^}]*margin:/);
  });

  it('masque tout le chrome de l’application', () => {
    const impression = blocImpression(css);

    for (const selecteur of ['.bilan-bar', '.bottom-nav', '.topbar', '.toast']) {
      expect(impression, selecteur).toContain(selecteur);
    }
    expect(impression).toMatch(/display:\s*none\s*!important/);
  });

  it('force un fond clair sur tous les conteneurs, jusqu’à la racine', () => {
    const impression = blocImpression(css);

    for (const selecteur of ['html', 'body', '#root', '.app', '.app-shell']) {
      expect(impression, selecteur).toContain(selecteur);
    }
    expect(impression).toContain('#ffffff !important');
  });

  it('cale les tableaux dans la largeur utile', () => {
    const impression = blocImpression(css);

    expect(impression).toContain('table-layout: fixed');
    expect(impression).toMatch(/width:\s*100%/);
  });
});
