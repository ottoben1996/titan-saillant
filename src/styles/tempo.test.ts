/**
 * Le bandeau du tempo.
 *
 * Décision prise sur maquette comparée : le temps se colle en haut de l'écran
 * de séance et ne bouge plus, avec un chiffre lisible à trois mètres (téléphone
 * posé au sol). Laura ne retrouvait plus le mouvement pendant que le compteur
 * tournait — le compteur vivait tout en bas du formulaire, hors de l'écran dès
 * qu'on remontait lire l'illustration.
 *
 * Ce test refuse le retour en arrière : le bandeau colle, le chiffre vient d'un
 * jeton, et le compteur ne redescend pas dans la carte de saisie.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const feuille = readFileSync('src/styles/workout.css', 'utf8');
const jetons = readFileSync('src/styles/tokens.css', 'utf8');
const ecran = readFileSync('src/components/screens/WorkoutScreen.tsx', 'utf8');

/** Le corps d'un bloc `sélecteur { … }`, sans descendre dans les imbrications. */
function corps(source: string, selecteur: string): string {
  // Les commentaires partent d'abord : sans ça, un commentaire qui parle de
  // « z-index » fait échouer le test qui interdit le z-index.
  const propre = source.replace(/\/\*[\s\S]*?\*\//g, '');
  // Plusieurs blocs peuvent viser le même sélecteur (un repli dans @supports) :
  // on les réunit, c'est l'ensemble des règles qui s'appliquent.
  return [...propre.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((bloc) => bloc[1].trim() === selecteur)
    .map((bloc) => bloc[2])
    .join('\n');
}

describe('bandeau du tempo', () => {
  it('ne peut pas recouvrir ce qui suit : aucun positionnement, aucun z-index', () => {
    const bloc = corps(feuille, '.tempo-band');
    expect(bloc, 'le sélecteur .tempo-band doit exister').not.toBe('');
    // Une vérification à l'aveugle sur un téléphone ne se rattrape pas :
    // on interdit la cause entière du recouvrement plutôt que de la corriger.
    expect(bloc).not.toMatch(/position:\s*(sticky|fixed|absolute)/);
    expect(bloc).not.toMatch(/z-index/);
  });

  it('ouvre l’écran, avant la carte de prescription', () => {
    const bande = ecran.indexOf('className="tempo-band"');
    const carte = ecran.indexOf('prescription-card');
    expect(bande).toBeGreaterThan(-1);
    expect(carte).toBeGreaterThan(-1);
    expect(bande).toBeLessThan(carte);
  });

  it('n’a pas de fond transparent : le contenu défile dessous', () => {
    const bloc = corps(feuille, '.tempo-band');
    expect(bloc).toMatch(/background:\s*var\(--surface-\d\)/);
  });

  it('tire la taille du chiffre d’un jeton, jamais d’une valeur écrite à la main', () => {
    const bloc = corps(feuille, '.workout-content .tempo-band .exercise-timer strong');
    expect(bloc).toMatch(/font-size:\s*var\(--fs-tempo\)/);
    expect(bloc).not.toMatch(/font-size:\s*\d/);
  });

  it('le jeton du grand chiffre reste lisible de loin', () => {
    const valeur = jetons.match(/--fs-tempo:\s*clamp\(([^)]+)\)/)?.[1];
    expect(valeur, 'le jeton --fs-tempo doit exister et être borné').toBeDefined();
    const grand = Number(
      valeur
        ?.split(',')
        .at(-1)
        ?.replace(/[^\d.]/g, ''),
    );
    // 7 rem = 112 px : en dessous, on ne lit plus à trois mètres (environ 12 mm).
    expect(grand).toBeGreaterThanOrEqual(7);
    expect(grand).toBeLessThanOrEqual(12);
  });

  it('le compteur ne redescend pas dans la carte de saisie', () => {
    const carte = ecran.slice(ecran.indexOf('log-card compact'), ecran.indexOf('log-card-heading'));
    expect(carte, 'la carte de saisie doit exister').not.toBe('');
    expect(carte).not.toMatch(/<ExerciseTimer/);
  });

  it('le compteur s’efface pendant le repos, qui a déjà son décompte', () => {
    expect(ecran).toMatch(/prescription\.durationSeconds && !resting/);
  });
});
