/**
 * L'agencement de l'écran de séance au téléphone — les quatre règles que la
 * journée du 6 octobre a coûté à trouver.
 *
 * Chacune a été payée par une mesure, pas par une intuition :
 *
 *  1. `overflow: hidden` sur la carte de prescription rognait le chiffre des
 *     répétitions (124 px de carte pour 148 de contenu) ;
 *  2. le premier correctif — figer la carte entière — a gonflé la colonne à
 *     1 418 px pour 782 visibles, compte à rebours du repos sous la ligne de
 *     flottaison ;
 *  3. une réserve de 130 px au bas de la colonne, reste d'une pilule flottante
 *     supprimée, poussait « Valider la série » à 804 px sur un écran de 620 ;
 *  4. et l'ordre du panneau de repos se joue dans le DOM, pas en CSS : un
 *     `order` donne le bon dessin et laisse l'ordre de lecture faux.
 *
 * Ces règles se lisent dans les fichiers, comme les autres tests de feuille du
 * dépôt : ce qui n'est pas mesuré ni verrouillé revient.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (chemin: string) => readFileSync(chemin, 'utf8');

describe('écran de séance au téléphone', () => {
  const workout = lire('src/styles/workout.css');
  const matiere = lire('src/styles/matiere.css');
  const screens = lire('src/styles/screens.css');
  const ecran = lire('src/components/screens/WorkoutScreen.tsx');

  it('supprime les illustrations média de la carte de prescription', () => {
    expect(ecran).not.toContain('exercise-illustration');
    expect(ecran).not.toContain('movement-frame');
    expect(workout).not.toContain('.exercise-illustration');
  });

  it('garde le tutoriel au rapport 9:16 sans trancher la vidéo', () => {
    // Le cadre portait `aspect-ratio: 9/16` ET `max-height: 48vh` : la hauteur
    // cédait, le rapport cassait (280 × 405, soit 0,69 au lieu de 0,5625) et
    // `overflow: hidden` tranchait le bas de la vidéo. La hauteur doit mener.
    const racine = lire('src/styles.css');
    // Les commentaires sont retirés : ils racontent l'ancien `max-height` et
    // feraient échouer l'assertion sur leurs propres mots.
    const regle = (racine.match(/\.tutorial-short-wrapper\s*\{[^}]*\}/)?.[0] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(regle).toContain('aspect-ratio: 9 / 16');
    expect(regle).toMatch(/height:\s*min\(/);
    expect(regle).not.toMatch(/max-height:/);
  });

  it('ne réserve plus de place au bas de la colonne de séance', () => {
    // 130 px + sp-11 faisaient 154 px de vide mesuré sous le dernier bloc.
    expect(matiere).not.toMatch(/\.workout-content\s*\{[^}]*padding-bottom:\s*calc\([^)]*130px/);
    expect(matiere).toMatch(/\.workout-content\s*\{[^}]*padding-bottom:\s*calc\(5rem \+ env\(safe-area-inset-bottom, 0px\)\)/);
  });

  it('range les trois réponses d’une question sur une seule rangée', () => {
    // En `flex-wrap`, la troisième réponse tombait seule, étirée à 317 px.
    expect(screens).toMatch(/\.quiz-choices\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
    expect(screens).not.toMatch(/\.quiz-choices\s*\{[^}]*flex-wrap:\s*wrap/);
  });

  it('réduit la carte de la série terminée à une ligne pendant le repos', () => {
    // Décision A : la carte occupait 499 px pendant le repos et poussait le
    // compte à rebours hors de l'écran. Tout s'efface sauf la ligne de résumé.
    expect(workout).toMatch(
      /\.workout-content \.prescription-card\.repose\s*>\s*:not\(\.repose-line\)\s*\{[^}]*display:\s*none/,
    );
    expect(ecran).toMatch(/prescription-card compact\$\{resting \? ' repose' : ''\}/);
    expect(ecran).toContain('repose-line');
    // La carte ne s'étire pas non plus : mesuré à 430 px, elle absorbait la place
    // libre et faisait 106 px pour une ligne de 18 — une boîte vide.
    expect(workout).toMatch(/\.prescription-card\.repose\s*\{[^}]*flex-grow:\s*0/);
  });

  it('laisse le panneau de repos derrière la carte, et l’ordre vient de la source', () => {
    // Ordre A : le titre reste en tête, la carte se réduit, le compte à rebours
    // suit. L'ordre se joue dans la source — un `order` CSS donne le bon dessin
    // et laisse l'ordre de lecture faux.
    const panneau = ecran.indexOf('rest-cockpit-container');
    const titre = ecran.indexOf('workout-heading');
    const carte = ecran.indexOf('prescription-card compact');
    expect(panneau).toBeGreaterThan(-1);
    expect(panneau).toBeGreaterThan(titre);
    expect(panneau).toBeGreaterThan(carte);
    expect(workout).not.toMatch(/order:\s*-1/);
  });
});
