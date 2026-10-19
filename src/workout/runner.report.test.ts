/**
 * Reporter un exercice : machine prise, on y revient plus tard.
 *
 * Ce que ce mécanisme doit garantir, et qui n'est pas évident :
 *
 *  1. **la séance ne saute pas d'étape.** Reporter ne touche pas au pas courant ;
 *     le pas `k` désigne simplement le suivant dans le nouvel ordre. Une erreur
 *     ici ferait recommencer ou sauter une série sans rien casser d'autre — donc
 *     sans que personne ne le voie ;
 *  2. **rien n'est perdu et rien n'est ajouté.** Le nombre de pas ne change pas,
 *     aucune série n'est enregistrée, et le retour au calme reste dernier ;
 *  3. **on revient bien dessus.** Parcourir la séquence entière après un report
 *     valide toutes les séries, y compris celles de l'exercice reporté.
 */
import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import type { WorkoutDay, WorkoutSession } from '../domain/types';
import {
  completeSet,
  createRunner,
  deferExercise,
  estReporte,
  getNextStep,
  getWorkoutExercises,
  getWorkoutSteps,
  jumpToExercise,
} from './runner';

const premierJour = () => getProgram('ottman').days[0];

/** Reporter l'exercice en cours du premier créneau. */
const deferred = (session: WorkoutSession, day: WorkoutDay = premierJour()) => deferExercise(session, day);

/** L'identifiant de l'exercice visé par un pas. */
function idDuPas(day: WorkoutDay, session: WorkoutSession, pas: ReturnType<typeof getNextStep>): string {
  const exercice = getWorkoutExercises(day, session)[pas.exerciseIndex ?? 0];
  if (!exercice) throw new Error(`Pas sans exercice : ${String(pas.exerciseIndex)}`);
  return exercice.id;
}

/** Tous les identifiants d'exercice d'une séquence, dans l'ordre. */
function idsSuite(day: WorkoutDay, session: WorkoutSession): string[] {
  const exercices = getWorkoutExercises(day, session);
  return getWorkoutSteps(day, session).map((pas) => exercices[pas.exerciseIndex ?? 0]?.id ?? '?');
}

/** Avance de `nombre` séries validées. */
function avancer(day: WorkoutDay, session: WorkoutSession, nombre: number): WorkoutSession {
  let courante = session;
  for (let index = 0; index < nombre; index += 1) {
    const pas = getNextStep(courante, day);
    if (pas.kind !== 'exercise') break;
    courante = completeSet(courante, day, {
      exerciseId: idDuPas(day, courante, pas),
      setIndex: pas.setIndex ?? 0,
    });
  }
  return courante;
}

describe('reporter un exercice', () => {
  it('ne déplace pas le pas courant et continue avec l’exercice suivant', () => {
    const day = premierJour();
    const session = avancer(day, createRunner(day, 'ottman'), 7);
    const avant = session.currentStepIndex ?? 0;
    const suiteAvant = idsSuite(day, session);
    const reporte = suiteAvant[avant] ?? idDuPas(day, session, getNextStep(session, day));

    const apres = deferExercise(session, day);

    // Le pas courant garde son rang.
    expect(apres.currentStepIndex).toBe(avant);

    // Et il désigne le premier pas qui n'appartient pas à l'exercice reporté.
    const attendu = suiteAvant.slice(avant).find((id) => id !== reporte);
    expect(idDuPas(day, apres, getNextStep(apres, day))).toBe(attendu);
  });

  it('replace les séries restantes après le travail, juste avant le retour au calme', () => {
    const day = premierJour();
    const session = avancer(day, createRunner(day, 'ottman'), 7);
    const avant = session.currentStepIndex ?? 0;
    const reporte = idsSuite(day, session)[avant];

    const apres = deferExercise(session, day);
    const suite = idsSuite(day, apres);
    const positions = suite
      .map((id, index) => ({ id, index }))
      .filter((item) => item.id === reporte)
      .map((item) => item.index);

    expect(positions.length).toBeGreaterThan(0);

    // Rien de l'exercice reporté ne traîne avant son bloc...
    const debut = Math.min(...positions);
    expect(suite[debut - 1]).not.toBe(reporte);

    // ...et ses séries arrivent groupées, avant le retour au calme.
    const exercices = getWorkoutExercises(day, apres);
    const premierRetour = suite.findIndex((id) => exercices.find((ex) => ex.id === id)?.kind === 'cooldown');
    if (premierRetour !== -1) {
      expect(Math.max(...positions)).toBeLessThan(premierRetour);
    }
  });

  it('ne change ni le nombre de pas, ni ce qui reste à faire', () => {
    const day = premierJour();
    const session = avancer(day, createRunner(day, 'ottman'), 5);

    const apres = deferExercise(session, day);

    expect(getWorkoutSteps(day, apres)).toHaveLength(getWorkoutSteps(day, session).length);
    // Reporter n'est pas faire : aucune série n'est enregistrée.
    expect(apres.loggedSets).toHaveLength(session.loggedSets.length);
    expect(apres.deferredExerciseIds).toHaveLength(1);
    // Et on n'est plus dessus : le pas courant est passé à l'exercice suivant.
    expect(estReporte(apres, day)).toBe(false);
    expect(estReporte(session, day)).toBe(false);
  });

  it('laisse terminer la séance complète, exercice reporté compris', () => {
    const day = premierJour();
    let session = deferExercise(avancer(day, createRunner(day, 'ottman'), 4), day);
    const total = getWorkoutSteps(day, session).length;

    for (let garde = 0; garde < total + 5; garde += 1) {
      const pas = getNextStep(session, day);
      if (pas.kind !== 'exercise') break;
      session = completeSet(session, day, {
        exerciseId: idDuPas(day, session, pas),
        setIndex: pas.setIndex ?? 0,
      });
      if (session.completedAt) break;
    }

    expect(session.loggedSets).toHaveLength(total);
    expect(session.completedAt).toBeDefined();
  });

  it('ne rejoue pas les séries déjà faites après un report partiel en circuit', () => {
    const day = getProgram('ottman').days[1];
    const initial = createRunner(day, 'ottman');
    const exercises = getWorkoutExercises(day, initial);
    const circuitStart = getWorkoutSteps(day, initial).findIndex(
      (step) => exercises[step.exerciseIndex ?? 0]?.circuitId === 'renfo-lower',
    );
    let session: typeof initial = { ...initial, currentStepIndex: circuitStart };

    // Complete round 1 of both circuit exercises. The next step is round 2 of
    // the first exercise, which already has one logged set.
    for (let count = 0; count < 2; count += 1) {
      const step = getNextStep(session, day);
      session = completeSet(session, day, {
        exerciseId: idDuPas(day, session, step),
        setIndex: step.setIndex ?? 0,
      });
    }
    const deferredId = idDuPas(day, session, getNextStep(session, day));
    const loggedBefore = session.loggedSets.filter((set) => set.exerciseId === deferredId);
    expect(loggedBefore).toHaveLength(1);

    const deferredSession = deferExercise(session, day);
    const nextStep = getNextStep(deferredSession, day);

    // The logged set remains in the canonical sequence for stable ordering, but
    // the cursor skips it and points at the first unlogged set.
    expect(idDuPas(day, deferredSession, nextStep)).not.toBe(deferredId);
    const deferredStep = getWorkoutSteps(day, deferredSession).find(
      (step) => idDuPas(day, deferredSession, step) === deferredId && step.setIndex === 1,
    );
    expect(deferredStep).toBeDefined();
  });

  it('ne reporte pas deux fois le même exercice', () => {
    const day = premierJour();
    let session = deferExercise(avancer(day, createRunner(day, 'ottman'), 3), day);
    expect(session.deferredExerciseIds).toHaveLength(1);

    // On avance jusqu'à retomber sur l'exercice reporté, à la fin du bloc de
    // travail : c'est exactement le geste demandé — y revenir plus tard.
    for (let garde = 0; garde < 40 && !estReporte(session, day); garde += 1) {
      const pas = getNextStep(session, day);
      if (pas.kind !== 'exercise') break;
      session = completeSet(session, day, {
        exerciseId: idDuPas(day, session, pas),
        setIndex: pas.setIndex ?? 0,
      });
    }
    expect(estReporte(session, day)).toBe(true);

    // Le reconfirmer ne doit rien ajouter à la liste.
    expect(deferExercise(session, day)).toBe(session);
    expect(session.deferredExerciseIds).toHaveLength(1);
  });

  it('ne reporte rien sur une séance terminée', () => {
    const day = premierJour();
    const session = avancer(day, createRunner(day, 'ottman'), 3);
    const terminee: WorkoutSession = { ...session, completedAt: '2026-10-05T11:00:00.000Z' };

    expect(deferExercise(terminee, day)).toBe(terminee);
  });
});

describe('aller à un exercice par la liste', () => {
  it('saute à la première série non validée de l’exercice désigné', () => {
    const day = premierJour();
    const session = deferred(avancer(day, createRunner(day, 'ottman'), 6));
    const cible = (session.deferredExerciseIds ?? [])[0];
    expect(cible).toBeDefined();

    const apres = jumpToExercise(session, day, cible ?? '');
    const pas = getNextStep(apres, day);

    expect(idDuPas(day, apres, pas)).toBe(cible);
    expect(estReporte(apres, day)).toBe(true);

    // On atterrit sur la première série qui reste : toutes celles d'avant sont
    // validées. L'exercice peut très bien en avoir une déjà faite en échauffement.
    const validees = session.loggedSets.filter((serie) => serie.exerciseId === cible).map((serie) => serie.setIndex);
    expect(validees).not.toContain(pas.setIndex);
    for (let rang = 0; rang < (pas.setIndex ?? 0); rang += 1) {
      expect(validees).toContain(rang);
    }
  });

  it('vaut aussi pour un exercice qui n’a pas été reporté', () => {
    const day = premierJour();
    const session = createRunner(day, 'ottman');
    const suite = idsSuite(day, session);
    const cible = suite[suite.length - 3];

    const apres = jumpToExercise(session, day, cible ?? '');

    expect(idDuPas(day, apres, getNextStep(apres, day))).toBe(cible);
  });

  it('ne bouge pas sur un exercice déjà terminé, ni sur le pas courant', () => {
    const day = premierJour();
    const session = avancer(day, createRunner(day, 'ottman'), 3);

    // Le premier exercice de la séance a toutes ses séries validées.
    const termine = idDuPas(day, session, getNextStep(session, day));
    const avance = avancer(day, session, 1);
    expect(jumpToExercise(avance, day, termine)).toBe(avance);

    // Redemander l'exercice en cours ne change rien non plus.
    const courant = idDuPas(day, avance, getNextStep(avance, day));
    expect(jumpToExercise(avance, day, courant)).toBe(avance);
  });

  it('laisse terminer l’exercice reporté après un saut, et la séance avec lui', () => {
    const day = premierJour();
    let session = deferred(avancer(day, createRunner(day, 'ottman'), 5));
    const cible = (session.deferredExerciseIds ?? [])[0] ?? '';
    session = jumpToExercise(session, day, cible);

    // On va jusqu'au bout de la séance depuis l'exercice reporté.
    for (let garde = 0; garde < 40; garde += 1) {
      const pas = getNextStep(session, day);
      if (pas.kind !== 'exercise') break;
      session = completeSet(session, day, {
        exerciseId: idDuPas(day, session, pas),
        setIndex: pas.setIndex ?? 0,
      });
      if (session.completedAt) break;
    }

    // L'exercice reporté est fait, et la séance peut se terminer.
    const attendues = getWorkoutExercises(day, session).find((ex) => ex.id === cible)?.sets.length ?? 0;
    const faites = session.loggedSets.filter((serie) => serie.exerciseId === cible).length;
    expect(faites).toBe(attendues);
    expect(session.completedAt).toBeDefined();
  });
});
