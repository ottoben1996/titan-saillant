import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import type { WorkoutSession } from '../domain/types';
import { getWorkoutExercises, getWorkoutSteps } from './runner';

/**
 * Le repos démarre-t-il vraiment ?
 *
 * Question posée après une vérification où le chrono de repos n'apparaissait
 * jamais : `finishSet` ne le lance que si l'exercice prescrit un repos, et il
 * sort en silence quand ce n'est pas le cas. En lisant le programme, la réponse
 * était dans les données : les deux premiers exercices de chaque séance sont des
 * échauffements **sans aucun repos prescrit**, et c'est le troisième qui en
 * donne un. Rien n'était cassé — c'est la vérification qui cliquait au mauvais
 * endroit.
 *
 * Ce test fige les deux moitiés de la réponse, pour qu'une modification du
 * programme qui supprimerait les repos se voie tout de suite.
 */
function sessionVide(profil: 'ottman' | 'laura', dayId: string): WorkoutSession {
  return {
    id: 'test',
    profileId: profil,
    dayId,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    sequenceVersion: 2,
    currentStepIndex: 0,
    loggedSets: [],
  } as WorkoutSession;
}

describe('prescription de repos du programme', () => {
  it('les échauffements n’en prescrivent aucun, et le disent en creux', () => {
    const programme = getProgram('ottman');
    const jour = programme.days[0];
    const exercices = getWorkoutExercises(jour, sessionVide('ottman', jour.id));

    for (const nom of ['Coiffe des rotateurs', 'Équilibre sur bosu']) {
      const exercice = exercices.find((e) => e.name === nom);
      expect(exercice, nom).toBeDefined();
      const parSerie = (exercice?.sets ?? []).map((s) => s.restSeconds);
      expect(
        parSerie.every((valeur) => valeur === undefined),
        nom,
      ).toBe(true);
      expect(exercice?.restAfterSeconds, nom).toBeUndefined();
    }
  });

  it('les exercices de force en prescrivent un, par série ou après l’exercice', () => {
    const programme = getProgram('ottman');
    const jour = programme.days[0];
    const exercices = getWorkoutExercises(jour, sessionVide('ottman', jour.id));

    // Le calcul exact de `finishSet` : la série d'abord, l'exercice en repli.
    const reposEffectif = (nom: string, indexSerie: number) => {
      const exercice = exercices.find((e) => e.name === nom);
      return exercice?.sets[indexSerie]?.restSeconds ?? exercice?.restAfterSeconds ?? 0;
    };

    expect(reposEffectif('Presse à cuisse inclinée', 0)).toBe(75);
    expect(reposEffectif('Presse à cuisse inclinée', 3)).toBe(135);
    expect(reposEffectif('Leg curl allongé', 0)).toBe(105);
    expect(reposEffectif('Chest Press Machine', 2)).toBe(120);
  });

  it('aucun mouvement en répétitions ne se retrouve sans repos du tout', () => {
    /**
     * L'échauffement d'entrée — deux mouvements de préparation — s'enchaîne sans
     * repos, et le cardio est chronométré : ni l'un ni l'autre ne sont des
     * mouvements de force. Le discriminant est la nature de la série, pas une
     * liste de mots-clés : une série écrite en répétitions se récupère, une série
     * chronométrée n'a rien à récupérer.
     */
    const ECHAUFFEMENT = new Set(['Coiffe des rotateurs', 'Équilibre sur bosu', 'Jumping Jack']);

    for (const profil of ['ottman', 'laura'] as const) {
      for (const jour of getProgram(profil).days) {
        for (const exercice of getWorkoutExercises(jour, sessionVide(profil, jour.id))) {
          if (ECHAUFFEMENT.has(exercice.name)) continue;
          const ecritEnRepetitions = (exercice.sets ?? []).some((s) => (s.repetitions ?? 0) > 0);
          if (!ecritEnRepetitions) continue;

          const aUnRepos =
            (exercice.sets ?? []).some((s) => (s.restSeconds ?? 0) > 0) || (exercice.restAfterSeconds ?? 0) > 0;
          expect(aUnRepos, `${profil}/${jour.id}/${exercice.name}`).toBe(true);
        }
      }
    }
  });

  it('la séance commence bien par un échauffement, pas par une série de force', () => {
    const programme = getProgram('ottman');
    const jour = programme.days[0];
    const etapes = getWorkoutSteps(jour, sessionVide('ottman', jour.id));

    expect(etapes[0]?.kind).toBe('exercise');
    expect(etapes[0]?.exerciseIndex).toBe(0);
  });
});
