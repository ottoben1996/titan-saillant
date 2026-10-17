import type { ExercisePrescription, LoggedSet, ProfileId, WorkoutDay, WorkoutSession } from '../domain/types';

export type RunnerStep = {
  kind: 'exercise' | 'complete';
  exerciseIndex?: number;
  setIndex?: number;
  sequenceIndex?: number;
};

const cooldownExercise = (day: WorkoutDay): ExercisePrescription => ({
  // La séance cardio supplémentaire reprend le retour au calme cardio déjà documenté.
  id: day.id === 'cardio-4' ? 'cooldown-cardio' : `cooldown-${day.id}`,
  name: day.cooldown.name,
  kind: 'cooldown',
  sets: [
    {
      durationSeconds: day.cooldown.durationSeconds,
      loadLabel: day.cooldown.loadLabel,
    },
  ],
  notes: day.cooldown.loadLabel,
});

export function getWorkoutExercises(day: WorkoutDay, session?: WorkoutSession): readonly ExercisePrescription[] {
  if (session && session.sequenceVersion !== 2) return day.exercises;
  return [...(day.warmup ?? []), ...day.exercises, cooldownExercise(day)];
}

/**
 * La séquence d'une séance : échauffement, travail, retour au calme.
 *
 * Les exercices reportés — machine occupée, à reprendre plus tard — sortent de
 * leur place et se regroupent **après le travail, juste avant le retour au
 * calme**. Deux propriétés tiennent tout le mécanisme :
 *
 *  - tout ce qui précède le pas courant garde son rang. Reporter ne touche donc
 *    jamais `currentStepIndex` : le pas `k` désigne simplement le suivant dans le
 *    nouvel ordre, et la séance continue là où elle était ;
 *  - le retour au calme reste dernier, quoi qu'il arrive.
 *
 * Le prix, à assumer : un exercice reporté n'est plus entrelacé avec son circuit.
 * Ses séries reviennent groupées, ce qui n'est pas ce que le coach a prescrit —
 * c'est le compromis d'une machine prise.
 */
export function getWorkoutSteps(day: WorkoutDay, session?: WorkoutSession): readonly RunnerStep[] {
  const exercises = getWorkoutExercises(day, session);
  const reportes = new Set(session?.deferredExerciseIds ?? []);
  const travail: RunnerStep[] = [];
  const attente: RunnerStep[] = [];
  const retour: RunnerStep[] = [];
  let exerciseIndex = 0;

  const retenir = (index: number, setIndex: number) => {
    const exercice = exercises[index];
    const pas: RunnerStep = { kind: 'exercise', exerciseIndex: index, setIndex };
    if (exercice.kind === 'cooldown') retour.push(pas);
    else if (reportes.has(exercice.id)) attente.push(pas);
    else travail.push(pas);
  };

  while (exerciseIndex < exercises.length) {
    const exercise = exercises[exerciseIndex];
    if (!exercise.circuitId) {
      exercise.sets.forEach((_, setIndex) => {
        retenir(exerciseIndex, setIndex);
      });
      exerciseIndex += 1;
      continue;
    }

    const circuitId = exercise.circuitId;
    const circuitIndexes: number[] = [];
    while (exerciseIndex < exercises.length && exercises[exerciseIndex].circuitId === circuitId) {
      circuitIndexes.push(exerciseIndex);
      exerciseIndex += 1;
    }
    const rounds = Math.max(...circuitIndexes.map((index) => exercises[index].sets.length));
    for (let setIndex = 0; setIndex < rounds; setIndex += 1) {
      for (const index of circuitIndexes) {
        if (exercises[index].sets[setIndex]) {
          retenir(index, setIndex);
        }
      }
    }
  }

  return [...travail, ...attente, ...retour].map((pas, index) => ({ ...pas, sequenceIndex: index }));
}

export function createRunner(day: WorkoutDay, profileId: ProfileId, programWeek?: number): WorkoutSession {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    profileId,
    dayId: day.id,
    programWeek,
    sequenceVersion: 2,
    currentStepIndex: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [],
  };
}
export function completeSet(
  session: WorkoutSession,
  day: WorkoutDay,
  actual: Omit<LoggedSet, 'completedAt'>,
): WorkoutSession {
  const current = getNextStep(session, day);
  if (
    current.kind !== 'exercise' ||
    current.exerciseIndex === undefined ||
    current.setIndex === undefined ||
    actual.exerciseId !== getWorkoutExercises(day, session)[current.exerciseIndex]?.id ||
    actual.setIndex !== current.setIndex
  ) {
    return session;
  }
  const next = structuredClone(session) as WorkoutSession;
  next.loggedSets.push({ ...actual, completedAt: new Date().toISOString() });
  next.activeTimer = undefined;
  if (next.sequenceVersion === 2) {
    const steps = getWorkoutSteps(day, next);
    const nextIndex = (next.currentStepIndex ?? 0) + 1;
    next.currentStepIndex = nextIndex;
    const nextStep = steps[nextIndex];
    if (!nextStep || nextStep.kind === 'complete') {
      next.completedAt = new Date().toISOString();
    } else {
      next.currentExerciseIndex = nextStep.exerciseIndex ?? 0;
      next.currentSetIndex = nextStep.setIndex ?? 0;
    }
  } else {
    const exercise = day.exercises[next.currentExerciseIndex];
    if (next.currentSetIndex + 1 < exercise.sets.length) next.currentSetIndex += 1;
    else if (next.currentExerciseIndex + 1 < day.exercises.length) {
      next.currentExerciseIndex += 1;
      next.currentSetIndex = 0;
    } else next.completedAt = new Date().toISOString();
  }
  next.updatedAt = new Date().toISOString();
  return next;
}
export function getNextStep(session: WorkoutSession, day?: WorkoutDay): RunnerStep {
  if (session.completedAt) return { kind: 'complete' };
  if (session.sequenceVersion === 2 && day) {
    return getWorkoutSteps(day, session)[session.currentStepIndex ?? 0] ?? { kind: 'complete' };
  }
  return { kind: 'exercise', exerciseIndex: session.currentExerciseIndex, setIndex: session.currentSetIndex };
}

/** Le pas désigne-t-il bien l'exercice attendu à cet endroit de la séance ? */
function exerciceDuPas(day: WorkoutDay, session: WorkoutSession, step: RunnerStep | undefined): string | undefined {
  if (!step || step.kind !== 'exercise' || step.exerciseIndex === undefined) return undefined;
  return getWorkoutExercises(day, session)[step.exerciseIndex]?.id;
}

/**
 * Passe l'exercice en cours, avec les séries qui restaient.
 *
 * Sans cela, une machine occupée dont les huit mouvements sans alternative font
 * partie bloquait la séance : le seul moyen d'avancer était de saisir de fausses
 * séries, qui partaient ensuite dans le volume, les records et le bilan remis au
 * coach. Aucune série n'est enregistrée ici — l'exercice est simplement laissé de
 * côté, et le carnet reste honnête.
 */
export function skipExercise(session: WorkoutSession, day: WorkoutDay): WorkoutSession {
  if (session.completedAt) return session;
  const steps = getWorkoutSteps(day, session);
  const index = session.currentStepIndex ?? 0;
  const courant = steps[index];
  if (!courant || courant.kind !== 'exercise' || courant.exerciseIndex === undefined) return session;

  // On saute la suite contiguë du même exercice : dans un circuit, on quitte donc
  // l'exercice pour le tour en cours, sans toucher aux autres.
  let suivant = index + 1;
  while (suivant < steps.length) {
    const pas = steps[suivant];
    if (!pas || pas.kind !== 'exercise' || pas.exerciseIndex !== courant.exerciseIndex) break;
    suivant += 1;
  }

  const next = structuredClone(session) as WorkoutSession;
  next.activeTimer = undefined;
  const cible = steps[suivant];
  if (!cible || cible.kind === 'complete') {
    next.currentStepIndex = steps.length;
    next.completedAt = new Date().toISOString();
  } else {
    next.currentStepIndex = suivant;
    next.currentExerciseIndex = cible.exerciseIndex ?? 0;
    next.currentSetIndex = cible.setIndex ?? 0;
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

/**
 * Annule la dernière série validée, et recule d'un pas.
 *
 * Un appui de trop sur « Valider la série » — une vingtaine par séance, souvent à
 * une main, téléphone posé — ne se corrigeait qu'en annulant la séance entière,
 * ce qui détruisait aussi les séries qui n'avaient rien demandé. C'était le seul
 * coût irréparable d'une faute de frappe en salle.
 */
export function undoLastSet(session: WorkoutSession, day: WorkoutDay): WorkoutSession {
  if (session.completedAt) return session;
  const index = session.currentStepIndex ?? 0;
  if (index <= 0) return session;

  const steps = getWorkoutSteps(day, session);
  const precedent = steps[index - 1];
  const identifiant = exerciceDuPas(day, session, precedent);
  if (!precedent || precedent.kind !== 'exercise' || !identifiant) return session;

  const next = structuredClone(session) as WorkoutSession;
  next.loggedSets = next.loggedSets.filter(
    (serie) => !(serie.exerciseId === identifiant && serie.setIndex === precedent.setIndex),
  );
  next.currentStepIndex = index - 1;
  next.currentExerciseIndex = precedent.exerciseIndex ?? 0;
  next.currentSetIndex = precedent.setIndex ?? 0;
  next.activeTimer = undefined;
  next.updatedAt = new Date().toISOString();
  return next;
}

/**
 * Met l'exercice en cours de côté, à reprendre plus tard dans la même séance.
 *
 * Le cas d'usage : la machine est prise. Aujourd'hui, les deux seules issues
 * étaient de tenir la machine ou de la remplacer par un autre mouvement — la
 * deuxième abandonne l'exercice prescrit pour de bon. Ici, l'exercice ressort de
 * sa place et revient après le bloc de travail : on le retrouve plus loin, avec
 * ses séries intactes.
 *
 * `currentStepIndex` n'est **pas** touché, et c'est volontaire : le pas courant
 * désigne, dans le nouvel ordre, exactement l'exercice suivant. La séance
 * continue sans rupture ni saut d'étape.
 *
 * Rien n'est enregistré : les séries reportées restent à faire. Une séance où
 * l'exercice est reporté n'est pas une séance où il est fait.
 */
export function deferExercise(session: WorkoutSession, day: WorkoutDay): WorkoutSession {
  if (session.completedAt) return session;

  const identifiant = exerciceDuPas(day, session, getNextStep(session, day));
  if (!identifiant) return session;

  const dejaReportes = session.deferredExerciseIds ?? [];
  if (dejaReportes.includes(identifiant)) return session;

  const next = structuredClone(session) as WorkoutSession;
  next.deferredExerciseIds = [...dejaReportes, identifiant];
  next.activeTimer = undefined;
  next.updatedAt = new Date().toISOString();
  return next;
}

/** L'exercice en cours avait-il été reporté plus tôt dans la séance ? */
export function estReporte(session: WorkoutSession, day: WorkoutDay): boolean {
  const identifiant = exerciceDuPas(day, session, getNextStep(session, day));
  return identifiant !== undefined && (session.deferredExerciseIds ?? []).includes(identifiant);
}

/**
 * Aller à un exercice précis, tout de suite.
 *
 * C'est le complément du report : une fois la machine libérée — ou simplement
 * parce qu'on a changé d'avis — on revient sur l'exercice en le désignant dans la
 * liste, au lieu d'attendre qu'il revienne dans l'ordre.
 *
 * La cible est la **première série non validée** de cet exercice, dans l'ordre
 * actuel de la séance. Un exercice déjà terminé n'a plus rien à faire : on ne
 * bouge pas, plutôt que de renvoyer l'athlète sur une série déjà comptée.
 */
export function jumpToExercise(session: WorkoutSession, day: WorkoutDay, exerciceId: string): WorkoutSession {
  if (session.completedAt) return session;
  if (session.sequenceVersion !== 2) return session;

  const exercices = getWorkoutExercises(day, session);
  const validees = new Set(
    session.loggedSets.filter((serie) => serie.exerciseId === exerciceId).map((serie) => serie.setIndex),
  );
  const etapes = getWorkoutSteps(day, session);
  const rang = etapes.findIndex(
    (pas) =>
      pas.kind === 'exercise' &&
      exercices[pas.exerciseIndex ?? 0]?.id === exerciceId &&
      !validees.has(pas.setIndex ?? 0),
  );
  if (rang === -1) return session;
  if (rang === (session.currentStepIndex ?? 0)) return session;

  const pas = etapes[rang];
  const next = structuredClone(session) as WorkoutSession;
  next.currentStepIndex = rang;
  next.currentExerciseIndex = pas.exerciseIndex ?? 0;
  next.currentSetIndex = pas.setIndex ?? 0;
  next.activeTimer = undefined;
  next.updatedAt = new Date().toISOString();
  return next;
}
