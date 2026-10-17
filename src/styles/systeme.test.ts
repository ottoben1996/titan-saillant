/**
 * Discipline du système de style.
 *
 * Avant ces échelles, la feuille comptait 93 marges intérieures, 45 tailles de
 * police, 40 écarts et 19 rayons différents, chacun écrit à la main au moment de
 * l'écriture de l'écran. Les écarts se voyaient, et chaque nouvel écran ajoutait
 * de la dérive.
 *
 * Ce test refuse toute valeur écrite à la main sur les propriétés concernées.
 * Même mécanique que le test de contraste des couleurs : la règle n'est pas un
 * commentaire, c'est une barrière.
 *
 * Ce qui reste autorisé, et pourquoi :
 *   - zéro, les pourcentages, et les valeurs négatives (ce sont des calages) ;
 *   - tout ce qui passe par une fonction, `calc()` ou `color-mix()` ;
 *   - les sélecteurs `.mustapha-*`, qui gardent volontairement leurs propres
 *     valeurs : c'est un second produit, isolé du premier.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FEUILLES = ['src/styles.css', ...readdirSync('src/styles').map((nom) => `src/styles/${nom}`)];

/** Propriétés soumises aux échelles. */
const PROPRIETES = [
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'margin',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'gap',
  'row-gap',
  'column-gap',
  'font-size',
  'border-radius',
];

const LONGUEUR_CRUE = /(?:^|[\s(])-?\d*\.?\d+(?:px|rem|em)\b/;

/**
 * Un calage négatif est un ajustement de quelques dixièmes de pixel : il n'a pas
 * d'équivalent dans une grille, et le remplacer déplacerait l'élément.
 */
const CALAGE_OPTICAL = /(?:^|[\s(])-\d/;

interface Infraction {
  fichier: string;
  selecteur: string;
  declaration: string;
}

/** Parcourt une feuille et relève les valeurs en dur, hors MUSTAPHA. */
function infractions(fichier: string): Infraction[] {
  const texte = readFileSync(fichier, 'utf8');
  const trouvees: Infraction[] = [];
  const declaration = /([a-zA-Z-]+):\s*([^;{}]+);/g;

  for (const trouve of texte.matchAll(declaration)) {
    const propriete = trouve[1];
    const valeur = trouve[2].trim();
    if (!PROPRIETES.includes(propriete)) continue;
    if (!LONGUEUR_CRUE.test(valeur)) continue;
    // Une fonction décide elle-même de sa valeur : clamp() pour la typographie
    // fluide, calc() pour les marges de sécurité de l'écran.
    if (valeur.includes('(')) continue;
    if (CALAGE_OPTICAL.test(valeur)) continue;

    // Le sélecteur courant : le texte compris entre l'accolade précédente et
    // l'accolade ouvrante de la règle qui porte cette déclaration.
    const avant = texte.slice(0, trouve.index);
    const ouvrante = avant.lastIndexOf('{');
    const borne = Math.max(avant.lastIndexOf('}', ouvrante - 1), avant.lastIndexOf('{', ouvrante - 1));
    const selecteur = avant.slice(borne + 1, ouvrante).trim();
    if (selecteur.startsWith('.mustapha')) continue;

    trouvees.push({ fichier, selecteur, declaration: `${propriete}: ${valeur}` });
  }

  return trouvees;
}

describe('système de style', () => {
  it('déclare les échelles d’espacement, de typographie et de rayons', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');

    for (const famille of ['--sp-1', '--sp-14', '--fs-1', '--fs-12', '--r-xs', '--r-2xl', '--r-full']) {
      expect(tokens, famille).toContain(`${famille}:`);
    }
  });

  it('n’admet aucune marge intérieure, écart, taille de police ni rayon écrit à la main', () => {
    const toutes = FEUILLES.flatMap(infractions);

    expect(
      toutes.map((i) => `${i.fichier} · ${i.selecteur} · ${i.declaration}`),
      'valeurs à remplacer par un jeton de l’échelle',
    ).toEqual([]);
  });

  it('ne compte pas plus de quinze pas d’espacement : une échelle reste courte', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');
    const pas = tokens.match(/--sp-\d+:/g) ?? [];

    expect(pas.length).toBeLessThanOrEqual(15);
  });
});
