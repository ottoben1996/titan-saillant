/**
 * Passer un exercice, annuler la dernière série.
 *
 * Les deux manques qui coûtaient le plus cher en salle :
 *
 *  - huit mouvements sur dix n'ont aucune alternative ; machine occupée, le seul
 *    moyen d'avancer était de saisir de fausses séries, qui partaient ensuite
 *    dans le volume et dans le bilan remis au coach ;
 *  - un appui de trop sur « Valider la série » ne se corrigeait qu'en annulant la
 *    séance entière, ce qui détruisait aussi les séries qui n'avaient rien demandé.
 */
import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import {
  completeSet,
  createRunner,
  getNextStep,
  getWorkoutExercises,
  getWorkoutSteps,
  skipExercise,
  undoLastSet,
} from './runner';

const premierJour = () => getProgram('ottman').days[0];

describe('passer un exercice', () => {
  it('avance à l’exercice suivant sans rien enregistrer', () => {
    const day = premierJour();
    const session = createRunner(day, 'ottman');
    const exercices = getWorkoutExercises(day, session);
    const avant = getNextStep(session, day);
    const identifiant = exercices[avant.exerciseIndex ?? 0].id;

    const apres = skipExercise(session, day);

    // Le carnet reste honnête : c'est là toute la différence avec « saisir de
    // fausses séries pour pouvoir avancer ».
    expect(apres.loggedSets).toHaveLength(0);
    const pas = getNextStep(apres, day);
    expect(pas.kind).toBe('exercise');
    expect(exercices[pas.exerciseIndex ?? 0].id).not.toBe(identifiant);
  });

  it('saute toutes les séries qui restaient au même exercice', () => {
    const day = premierJour();
    let session = createRunner(day, 'ottman');
    const exercices = getWorkoutExercises(day, session);

    // On se place sur le deuxième exercice, qui a plusieurs séries.
    const premier = getNextStep(session, day);
    session = completeSet(session, day, {
      exerciseId: exercices[premier.exerciseIndex ?? 0].id,
      setIndex: premier.setIndex ?? 0,
    });
    const courant = getNextStep(session, day);
    const identifiant = exercices[courant.exerciseIndex ?? 0].id;
    const pasAvant = session.currentStepIndex ?? 0;

    const apres = skipExercise(session, day);

    const pas = getNextStep(apres, day);
    expect(exercices[pas.exerciseIndex ?? 0].id).not.toBe(identifiant);
    // The current index now points at the next step in the rebuilt sequence.
    expect(apres.currentStepIndex ?? 0).toBeGreaterThanOrEqual(pasAvant);
    expect(apres.loggedSets).toHaveLength(1);
  });

  it('termine la séance quand c’était le dernier exercice', () => {
    const day = premierJour();
    let session = createRunner(day, 'ottman');

    // On saute d'exercice en exercice jusqu'au bout.
    for (let garde = 0; garde < 40 && getNextStep(session, day).kind === 'exercise'; garde += 1) {
      session = skipExercise(session, day);
    }

    expect(session.completedAt).toBeDefined();
    expect(getNextStep(session, day)).toEqual({ kind: 'complete' });
    expect(session.loggedSets).toHaveLength(0);
  });
});

describe('annuler la dernière série', () => {
  it('retire la série validée et revient d’un pas', () => {
    const day = premierJour();
    let session = createRunner(day, 'ottman');
    const exercices = getWorkoutExercises(day, session);
    const premier = getNextStep(session, day);
    session = completeSet(session, day, {
      exerciseId: exercices[premier.exerciseIndex ?? 0].id,
      setIndex: premier.setIndex ?? 0,
    });
    expect(session.loggedSets).toHaveLength(1);

    const annule = undoLastSet(session, day);

    expect(annule.loggedSets).toHaveLength(0);
    expect(annule.currentStepIndex).toBe(0);
    expect(getNextStep(annule, day)).toMatchObject(premier);
  });

  it('ne touche pas aux autres séries de la séance', () => {
    const day = premierJour();
    const exercices = getWorkoutExercises(day, createRunner(day, 'ottman'));
    let session = createRunner(day, 'ottman');

    // Deux séries validées, puis on annule la seconde.
    for (let index = 0; index < 2; index += 1) {
      const pas = getNextStep(session, day);
      session = completeSet(session, day, {
        exerciseId: exercices[pas.exerciseIndex ?? 0].id,
        setIndex: pas.setIndex ?? 0,
      });
    }
    expect(session.loggedSets).toHaveLength(2);

    const annule = undoLastSet(session, day);

    expect(annule.loggedSets).toHaveLength(1);
    expect(annule.loggedSets[0]).toEqual(session.loggedSets[0]);
  });

  it('ne fait rien au tout premier pas', () => {
    const day = premierJour();
    const session = createRunner(day, 'ottman');

    expect(undoLastSet(session, day)).toBe(session);
  });

  it('ne rouvre pas une séance terminée', () => {
    const day = premierJour();
    const terminee = { ...createRunner(day, 'ottman'), completedAt: '2026-10-05T11:00:00.000Z' };

    expect(undoLastSet(terminee, day)).toBe(terminee);
    expect(skipExercise(terminee, day)).toBe(terminee);
  });
});

describe('regression: skipExercise in interleaved circuit', () => {
  it('skips ALL remaining steps for current exercise across entire circuit, not just contiguous ones', () => {
    const day = premierJour();
    let session = createRunner(day, 'ottman');

    // Advance to the circuit portion (jumping-jack / gainage-planche circuit)
    const steps = getWorkoutSteps(day, session);
    const exercises = getWorkoutExercises(day, session);

    // Find first circuit exercise step
    let circuitStartIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      const ex = exercises[steps[i].exerciseIndex!];
      if (ex.circuitId === 'finisher-a') {
        circuitStartIndex = i;
        break;
      }
    }

    expect(circuitStartIndex).toBeGreaterThan(-1);

    // Advance to the first circuit step
    session.currentStepIndex = circuitStartIndex;
    session.currentExerciseIndex = steps[circuitStartIndex].exerciseIndex!;
    session.currentSetIndex = steps[circuitStartIndex].setIndex!;

    const currentStep = getNextStep(session, day);
    const exerciseId = exercises[currentStep.exerciseIndex!].id; // e.g., 'jumping-jack'

    // Skip the current exercise (jumping-jack) immediately.
    // The skip should skip ALL remaining sets of jumping-jack across the circuit.
    session = skipExercise(session, day);

    // After skip, we should NOT see any more jumping-jack steps
    const remainingSteps = getWorkoutSteps(day, session).slice(session.currentStepIndex ?? 0);
    const hasMoreJumpingJack = remainingSteps.some((step) => {
      if (step.kind !== 'exercise') return false;
      return exercises[step.exerciseIndex!].id === exerciseId;
    });

    expect(hasMoreJumpingJack).toBe(false);

    // Should be on the NEXT exercise after all jumping-jack sets are gone
    // (either gainage-planche or cooldown)
    const nextStep = getNextStep(session, day);
    if (nextStep.kind === 'exercise') {
      expect(exercises[nextStep.exerciseIndex!].id).not.toBe(exerciseId);
    }
  });

  it('skipExercise preserves other exercises in the circuit', () => {
    const day = premierJour();
    let session = createRunner(day, 'ottman');

    // Advance to circuit
    const steps = getWorkoutSteps(day, session);
    const exercises = getWorkoutExercises(day, session);

    let circuitStartIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      const ex = exercises[steps[i].exerciseIndex!];
      if (ex.circuitId === 'finisher-a') {
        circuitStartIndex = i;
        break;
      }
    }

    session.currentStepIndex = circuitStartIndex;
    session.currentExerciseIndex = steps[circuitStartIndex].exerciseIndex!;
    session.currentSetIndex = steps[circuitStartIndex].setIndex!;

    const currentStep = getNextStep(session, day);
    const otherExerciseId =
      exercises[currentStep.exerciseIndex!].id === 'jumping-jack' ? 'gainage-planche' : 'jumping-jack';

    // Skip the first exercise immediately
    session = skipExercise(session, day);

    // The other exercise should still be present in remaining steps
    const remainingSteps = getWorkoutSteps(day, session).slice(session.currentStepIndex ?? 0);
    const hasOtherExercise = remainingSteps.some((step) => {
      if (step.kind !== 'exercise') return false;
      return exercises[step.exerciseIndex!].id === otherExerciseId;
    });

    expect(hasOtherExercise).toBe(true);
  });
});
