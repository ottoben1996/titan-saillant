import { describe, expect, it } from 'vitest';
import { getWorkoutExercises } from '../workout/runner';
import { getProgram } from './programs';
import { tutorials } from './tutorials';

const entries = Object.entries(tutorials);

/**
 * Identifiants réellement parcourus par l'application pour les deux profils :
 * échauffements, séries de travail, finishers en circuit et retour au calme
 * (l'id du retour au calme est construit par le runner sous la forme
 * `cooldown-<dayId>`).
 */
function prescribedExerciseIds(): string[] {
  const ids = new Set<string>();
  for (const profile of ['ottman', 'laura'] as const) {
    const program = getProgram(profile);
    for (const exercise of program.warmup) ids.add(exercise.id);
    for (const day of program.days) {
      for (const exercise of getWorkoutExercises(day)) ids.add(exercise.id);
    }
  }
  return [...ids];
}

/** Exceptions tolérées : aucun id du programme ne doit en avoir besoin ici. */
const TOLERATED_WITHOUT_TUTORIAL: readonly string[] = [];

describe('tutoriels (contenu pédagogique)', () => {
  it('expose au moins un tutoriel et respecte la convention clé === exerciseId', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, tutorial] of entries) {
      expect(tutorial.exerciseId, `clé « ${key} »`).toBe(key);
    }
  });

  it('couvre chaque identifiant d’exercice du programme, retour au calme compris', () => {
    const missing = prescribedExerciseIds().filter(
      (id) => !TOLERATED_WITHOUT_TUTORIAL.includes(id) && tutorials[id] === undefined,
    );
    expect(missing, `tutoriels manquants : ${missing.join(', ')}`).toEqual([]);
  });

  it.each(entries)('« %s » : au moins 3 étapes non vides', (_key, tutorial) => {
    expect(tutorial.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of tutorial.steps) expect(step.trim()).not.toBe('');
  });

  it.each(entries)('« %s » : au moins 2 erreurs fréquentes non vides', (_key, tutorial) => {
    expect(tutorial.commonMistakes.length).toBeGreaterThanOrEqual(2);
    for (const mistake of tutorial.commonMistakes) expect(mistake.trim()).not.toBe('');
  });

  it.each(entries)('« %s » : au moins 1 consigne de sécurité non vide', (_key, tutorial) => {
    expect(tutorial.safety.length).toBeGreaterThanOrEqual(1);
    for (const rule of tutorial.safety) expect(rule.trim()).not.toBe('');
  });

  it.each(entries)('« %s » : repère clé, position et muscles renseignés', (_key, tutorial) => {
    expect(tutorial.keyCue?.trim(), 'keyCue').toBeTruthy();
    expect(tutorial.position.trim()).not.toBe('');
    expect(tutorial.title.trim()).not.toBe('');
    expect(tutorial.muscles.length).toBeGreaterThan(0);
    expect(tutorial.equipment.length).toBeGreaterThan(0);
    expect(tutorial.primaryMuscles?.length ?? 0, 'primaryMuscles').toBeGreaterThan(0);
  });

  it('ne répète jamais exactement le même texte entre deux exercices', () => {
    const seen = new Map<string, string>();
    for (const [key, tutorial] of entries) {
      const texts = [
        tutorial.position,
        ...tutorial.steps,
        ...tutorial.commonMistakes,
        ...tutorial.safety,
        tutorial.keyCue ?? '',
      ].filter((text) => text.trim() !== '');
      for (const text of texts) {
        const owner = seen.get(text);
        expect(owner, `texte dupliqué entre « ${owner} » et « ${key} » : ${text}`).toBeUndefined();
        seen.set(text, key);
      }
    }
  });

  it('déclare un Short YouTube exploitable ou rien du tout', () => {
    for (const [key, tutorial] of entries) {
      if (tutorial.youtubeShortId === undefined) continue;
      expect(tutorial.youtubeShortId.trim(), `short de « ${key} »`).not.toBe('');
      expect(tutorial.youtubeShortId, `short de « ${key} »`).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('ne tolère aucune exception de couverture sans tutoriel', () => {
    const uncovered = prescribedExerciseIds().filter((id) => tutorials[id] === undefined);
    expect(uncovered).toEqual(TOLERATED_WITHOUT_TUTORIAL.filter((id) => tutorials[id] === undefined));
  });
});
