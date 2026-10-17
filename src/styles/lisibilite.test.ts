/**
 * Lisibilité en salle : le chiffre du repos et les paliers de charge.
 *
 * Deux décisions prises sur mesure, pas à l'œil — et chacune a une façon de se
 * défaire sans qu'on s'en aperçoive :
 *
 *  1. le chiffre du repos valait 28 px contre 94 px pour le tempo. C'est le seul
 *     nombre qu'on lit debout, à un mètre, en marchant vers la machine suivante.
 *     Le remettre sur l'échelle numérotée (`--fs-10`) annulerait la décision sans
 *     rien casser — d'où ce test ;
 *  2. les quatre boutons de palier partageaient une seule règle : distinguer
 *     « +5 » de « +2,5 » demandait de lire le chiffre. Si les deux modificateurs
 *     convergent à nouveau, l'erreur d'un cran revient.
 *
 * Les seuils sont lus dans le CSS livré, jamais dans une capture : une capture ne
 * dit pas ce qui est servi.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const feuille = readFileSync('src/styles.css', 'utf8');
const seance = readFileSync('src/styles/workout.css', 'utf8');
const ecran = readFileSync('src/components/screens/WorkoutScreen.tsx', 'utf8');

/** Le bloc de règles d'un sélecteur, accolades comprises. */
function bloc(css: string, selecteur: string): string {
  const depart = css.indexOf(selecteur);
  if (depart === -1) throw new Error(`Sélecteur absent du CSS : ${selecteur}`);
  return css.slice(depart, css.indexOf('}', depart) + 1);
}

describe('chiffre du repos', () => {
  it('a son propre jeton, et il est plus grand que le précédent', () => {
    // Le jeton existe : 2.5rem = 40 px, contre 1.75rem = 28 px avant.
    expect(tokens).toContain('--fs-repos: 2.5rem');
  });

  it('est le seul à habiller le chiffre du repos', () => {
    const regle = bloc(feuille, '.rest-orbit-content strong {');

    expect(regle).toContain('var(--fs-repos)');
    // Repasser sur l'échelle numérotée remettrait le chiffre à 28 px.
    expect(regle).not.toContain('var(--fs-10)');
  });

  it('fait suivre le cercle qui l’entoure', () => {
    const regle = bloc(seance, '.workout-content .rest-orbit-svg-container {');

    expect(regle).toContain('width: 128px');
    expect(regle).toContain('height: 128px');
  });

  it('garde une taille tenable sur les écrans bas', () => {
    // Sur un écran de moins de 700 px de haut, le cercle redescend — mais pas
    // sous les 108 px d'origine, sinon le chiffre de 40 px n'aurait plus d'air.
    const media = seance.slice(seance.indexOf('max-height: 700px'));
    const cercle = media.slice(
      media.indexOf('rest-orbit-svg-container'),
      media.indexOf('}', media.indexOf('rest-orbit-svg-container')),
    );

    expect(cercle).toContain('108px');
  });
});

describe('paliers de charge', () => {
  it('distingue le gros palier du palier fin par le remplissage', () => {
    const grand = bloc(feuille, '.step-btn.pas-grand {');
    const fin = bloc(feuille, '.step-btn.pas-fin {');

    // Le gros palier est plein, le fin est en contour : la forme se lit avant le chiffre.
    expect(grand).toContain('background: var(--accent)');
    expect(fin).toContain('background: transparent');
    expect(fin).not.toContain('background: var(--accent)');
  });

  it('conserve les 44 px de cible tactile sur les deux', () => {
    // Le modificateur ne doit pas toucher à la taille de la cible.
    for (const modificateur of ['.step-btn.pas-grand {', '.step-btn.pas-fin {']) {
      const regle = bloc(feuille, modificateur);
      expect(regle).not.toContain('min-width');
      expect(regle).not.toContain('height:');
    }
  });

  it('est appliqué aux quatre boutons de charge de l’écran de séance', () => {
    // Deux gros (baisse et hausse) et deux fins — pas un de plus, pas un de moins.
    expect((ecran.match(/step-btn pas-grand/g) ?? []).length).toBe(2);
    expect((ecran.match(/step-btn pas-fin/g) ?? []).length).toBe(2);
  });
});
