/**
 * Mouvement et matière.
 *
 * Deux choses à figer, apprises en écrivant cette couche :
 *
 *  1. une courbe de ressort doit se terminer exactement sur 1. Ma première
 *     version, avec une durée choisie à l'œil, finissait à 0,786 — l'élément
 *     sautait à sa place à la fin de l'animation, et personne ne l'aurait vu
 *     dans un test visuel ;
 *  2. toute animation doit avoir son repli `prefers-reduced-motion`. C'est une
 *     règle du projet, et elle se vérifie comme les autres : mécaniquement.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const matiere = readFileSync('src/styles/matiere.css', 'utf8');

/** Dernière valeur d'une courbe `linear()`. */
function arrivee(courbe: string): number {
  const interieur = courbe.slice(courbe.indexOf('(') + 1, courbe.lastIndexOf(')'));
  const morceaux = interieur.split(',');
  const dernier = morceaux[morceaux.length - 1].trim().split(/\s+/);
  return Number.parseFloat(dernier[0]);
}

describe('courbes de ressort', () => {
  it('se terminent toutes exactement sur 1', () => {
    const courbes = tokens.match(/--ressort[a-z-]*:\s*linear\([^;]+\);/g) ?? [];

    expect(courbes.length).toBe(3);
    for (const declaration of courbes) {
      const nom = declaration.slice(0, declaration.indexOf(':'));
      const valeur = declaration.slice(declaration.indexOf('linear('), -1);
      expect(arrivee(valeur), nom).toBe(1);
    }
  });

  it('la courbe vive a un dépassement, mais franc et court', () => {
    const vive = tokens.slice(tokens.indexOf('--ressort-vif:'));
    const courbe = vive.slice(vive.indexOf('linear('), vive.indexOf(');') + 1);
    const valeurs = courbe
      .slice(courbe.indexOf('(') + 1, -1)
      .split(',')
      .map((morceau) => Number.parseFloat(morceau.trim().split(/\s+/)[0]));

    const sommet = Math.max(...valeurs);
    expect(sommet).toBeGreaterThan(1);
    expect(sommet).toBeLessThan(1.08);
  });
});

describe('couche matière et mouvement', () => {
  it('n’anime jamais un flou', () => {
    // Un backdrop-filter animé coûte une repainte par image. Seules l'opacité et
    // la transformation ont le droit d'apparaître dans une transition.
    const transitions = matiere.match(/transition:[^;]+;/g) ?? [];

    expect(transitions.length).toBeGreaterThan(4);
    for (const regle of transitions) {
      expect(regle, regle).not.toMatch(/backdrop|blur|filter/);
    }
  });

  it('annule tout mouvement quand la personne le demande', () => {
    const repli = matiere.slice(matiere.indexOf('prefers-reduced-motion'));
    expect(repli).not.toBe('');

    for (const cible of ['.topbar::before', '.topbar-titre', '.sheet-content', '.app-shell button', ':active']) {
      expect(repli, cible).toContain(cible);
    }
    expect(repli).toContain('transform: none');
  });

  it('prévoit un fond opaque si le flou n’existe pas', () => {
    expect(matiere).toContain('@supports not ((-webkit-backdrop-filter');
    expect(matiere).toContain('background: var(--surface-1)');
  });

  it('n’utilise que des jetons de surface existants', () => {
    // `--bg` n'existe pas dans ce projet : l'écrire donne un fond transparent et
    // une barre invisible, sans erreur nulle part.
    const jetons = new Set((tokens.match(/--[a-z0-9-]+:/g) ?? []).map((jeton) => jeton.slice(0, -1)));
    const utilises = matiere.match(/var\(--[a-z0-9-]+\)/g) ?? [];

    for (const jeton of utilises) {
      const nom = jeton.slice(4, -1);
      expect(jetons.has(nom), nom).toBe(true);
    }
  });
});
