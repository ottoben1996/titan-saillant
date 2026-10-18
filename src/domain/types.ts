export type ProfileId = 'ottman' | 'laura';

/**
 * Les quatre crÃ©neaux du programme, dans l'ordre oÃ¹ ils sont proposÃ©s.
 *
 * Source unique : le schÃ©ma de lecture d'une sauvegarde les Ã©numÃ©rait Ã  la main
 * et avait divergÃ© â€” une sauvegarde contenant la quatriÃ¨me sÃ©ance, Â« Rameur +
 * marche Â», Ã©tait refusÃ©e en bloc Ã  la restauration. DÃ©river le type de la liste
 * empÃªche les deux de repartir chacun de leur cÃ´tÃ©.
 */
export const WORKOUT_DAY_IDS = ['full-body-a', 'full-body-b', 'cardio', 'cardio-4'] as const;
export type WorkoutDayId = (typeof WORKOUT_DAY_IDS)[number];
export type ExerciseKind = 'strength' | 'timed' | 'cardio' | 'warmup' | 'cooldown';

/** Charges saisies manuellement, indexÃ©es par exercice puis par semaine S1 â†’ S8. */
export type ManualLoadOverrides = Readonly<Record<string, readonly (number | null)[]>>;
/** DurÃ©es saisies manuellement, en secondes, indexÃ©es par exercice puis S1 â†’ S8. */
export type ManualDurationOverrides = Readonly<Record<string, readonly (number | null)[]>>;

export interface SetPrescription {
  readonly repetitions?: number;
  readonly durationSeconds?: number;
  readonly loadKg?: number;
  readonly loadLabel?: string;
  readonly restSeconds?: number;
  readonly phase?: 'warmup' | 'working';
}

export interface ExercisePrescription {
  readonly id: string;
  readonly name: string;
  readonly kind: ExerciseKind;
  readonly sets: readonly SetPrescription[];
  /** Charges de travail prÃ©vues par semaine (S1 â†’ S8). */
  readonly weeklyLoadKg?: readonly number[];
  /** Exception quand une semaine comporte plusieurs charges dans le mÃªme exercice. */
  readonly weeklySetLoadsKg?: readonly (readonly number[])[];
  readonly notes?: string;
  readonly circuitId?: string;
  readonly restAfterSeconds?: number;
}

export interface WorkoutDay {
  readonly id: WorkoutDayId;
  readonly name: string;
  readonly subtitle: string;
  readonly exercises: readonly ExercisePrescription[];
  readonly warmup?: readonly ExercisePrescription[];
  readonly cooldown: Readonly<{
    readonly name: string;
    readonly durationSeconds: number;
    readonly loadLabel?: string;
  }>;
}

export interface WorkoutPlan {
  readonly profileId: ProfileId;
  readonly displayName: string;
  readonly coach: string;
  readonly warmup: readonly ExercisePrescription[];
  readonly days: readonly WorkoutDay[];
}

export interface Tutorial {
  readonly exerciseId: string;
  readonly title: string;
  readonly muscles: readonly string[];
  readonly equipment: readonly string[];
  readonly position: string;
  readonly steps: readonly string[];
  readonly commonMistakes: readonly string[];
  readonly safety: readonly string[];
  readonly videoUrl?: string;
  readonly youtubeShortId?: string;
  readonly primaryMuscles?: readonly string[];
  readonly secondaryMuscles?: readonly string[];
  readonly tempoRecommended?: string;
  readonly keyCue?: string;
}

/** Consigne du quiz de fin de sÃ©ance, reprise dans le bilan hebdomadaire. */
export type LoadConsigne = 'increase' | 'same' | 'decrease';

export interface LoggedSet {
  /** Stable identity for corrections. Optional for imports created before correction timeline. */
  setId?: string;
  exerciseId: string;
  setIndex: number;
  actualRepetitions?: number;
  actualDurationSeconds?: number;
  actualLoadKg?: number;
  completedAt: string;
}

export interface SessionTimerState {
  kind: 'rest' | 'tempo';
  exerciseId: string;
  setIndex: number;
  remainingSeconds: number;
  paused: boolean;
  /** Faux au chargement d'une sÃ©rie tempo, avant l'appui explicite sur Â« DÃ©marrer Â». */
  started?: boolean;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  profileId: ProfileId;
  dayId: WorkoutDayId;
  /** Semaine de prescription utilisÃ©e pour cette sÃ©ance, absent dans les anciennes sauvegardes. */
  programWeek?: number;
  sequenceVersion?: 2;
  currentStepIndex?: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Séance interrompue par le démarrage d’une nouvelle séance. */
  abandonedAt?: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  loggedSets: LoggedSet[];
  activeTimer?: SessionTimerState;
  /** Retour post-sÃ©ance, facultatif pour rester compatible avec les anciennes sauvegardes. */
  perceivedExertion?: number;
  /** 1 Ã  5 : 5 Â« mieux que d'habitude Â», 3 Â« comme d'habitude Â», 1 Â« moins bien Â». */
  energy?: number;
  pain?: string;
  /** OÃ¹ se situe la gÃªne, quand il y en a une. */
  painLocation?: string;
  /** Ce que l'athlÃ¨te demande pour la prochaine fois. */
  loadConsigne?: LoadConsigne;
  notes?: string;
  alternativesUsed?: string[];
  /**
   * Exercices mis de cÃ´tÃ© parce que leur machine Ã©tait prise, Ã  reprendre plus
   * tard dans la mÃªme sÃ©ance.
   *
   * Facultatif : absent des sÃ©ances enregistrÃ©es avant cette fonctionnalitÃ©, et
   * l'absence vaut Â« rien de reportÃ© Â».
   */
  deferredExerciseIds?: string[];
  /** Exercices dont toutes les séries restantes ont été ignorées. */
  skippedExerciseIds?: string[];
}
