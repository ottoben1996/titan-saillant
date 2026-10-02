export type ProfileId = 'ottman' | 'laura';

export type WorkoutDayId = 'full-body-a' | 'full-body-b' | 'cardio' | 'cardio-4';
export type ExerciseKind = 'strength' | 'timed' | 'cardio' | 'warmup' | 'cooldown';

/** Charges saisies manuellement, indexées par exercice puis par semaine S1 → S8. */
export type ManualLoadOverrides = Readonly<Record<string, readonly (number | null)[]>>;
/** Durées saisies manuellement, en secondes, indexées par exercice puis S1 → S8. */
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
  /** Charges de travail prévues par semaine (S1 → S8). */
  readonly weeklyLoadKg?: readonly number[];
  /** Exception quand une semaine comporte plusieurs charges dans le même exercice. */
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

/** Consigne du quiz de fin de séance, reprise dans le bilan hebdomadaire. */
export type LoadConsigne = 'increase' | 'same' | 'decrease';

export interface LoggedSet {
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
  /** Faux au chargement d'une série tempo, avant l'appui explicite sur « Démarrer ». */
  started?: boolean;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  profileId: ProfileId;
  dayId: WorkoutDayId;
  /** Semaine de prescription utilisée pour cette séance, absent dans les anciennes sauvegardes. */
  programWeek?: number;
  sequenceVersion?: 2;
  currentStepIndex?: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  loggedSets: LoggedSet[];
  activeTimer?: SessionTimerState;
  /** Retour post-séance, facultatif pour rester compatible avec les anciennes sauvegardes. */
  perceivedExertion?: number;
  /** 1 à 5 : 5 « mieux que d'habitude », 3 « comme d'habitude », 1 « moins bien ». */
  energy?: number;
  pain?: string;
  /** Où se situe la gêne, quand il y en a une. */
  painLocation?: string;
  /** Ce que l'athlète demande pour la prochaine fois. */
  loadConsigne?: LoadConsigne;
  notes?: string;
  alternativesUsed?: string[];
}
