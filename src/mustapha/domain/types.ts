export type Goal = 'fat-loss' | 'maintenance' | 'recomposition' | 'muscle-gain';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrackingMode = 'portions' | 'macros';
export type CoachTone = 'standard' | 'directive' | 'dictator-rp';
export type WeeklySessions = 2 | 3 | 4 | 5 | 6;
export type ProgramSplit = 'full-body' | 'ppl' | 'upper-lower';
export type TrainingKind = 'strength' | 'cardio' | 'active-rest' | 'rest';

export interface MustaphaProfile {
  id: 'mustapha';
  firstName: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  level: ExperienceLevel;
  goal: Goal;
  availableDays: string[];
  equipment: string[];
  dietaryConstraints: string[];
  allergies: string[];
  excludedFoods: string[];
  trackingMode: TrackingMode;
  weeklySessions?: WeeklySessions;
  split?: ProgramSplit;
  coachTone?: CoachTone;
  consent: boolean;
  healthWarningAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SetPrescription {
  readonly repetitions?: number;
  readonly durationSeconds?: number;
  readonly loadKg?: number;
  readonly restSeconds: number;
  readonly tempo?: string;
  readonly method?: 'straight-set' | 'superset' | 'biset' | 'drop-set' | 'rest-pause' | 'amrap' | '10x10';
}

export interface ExercisePrescription {
  readonly id: string;
  readonly name: string;
  readonly muscle: string;
  readonly sets: readonly SetPrescription[];
  readonly notes?: string;
}

export interface TrainingDay {
  readonly id: string;
  readonly week: number;
  readonly dayLabel: string;
  readonly name: string;
  readonly kind: TrainingKind;
  readonly focus: string;
  readonly exercises: readonly ExercisePrescription[];
}

export interface TrainingWeek {
  readonly week: number;
  readonly label: string;
  readonly days: readonly TrainingDay[];
}

export interface TrainingPlan {
  readonly id: 'mustapha-v1';
  readonly sourceId: 'weight-loss' | 'body-build' | 'crosscooking';
  readonly sourceVersion: '2026-09';
  readonly planVersion: 'mustapha-v1';
  readonly weeks: readonly TrainingWeek[];
}

export interface LoggedSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  prescribedLoad?: number;
  prescribedReps?: number;
  prescribedDurationSeconds?: number;
  actualLoad?: number;
  actualReps?: number;
  actualDurationSeconds?: number;
  status: 'pending' | 'completed' | 'skipped';
  rpe?: number;
  note?: string;
  completedAt?: string;
}

export interface WorkoutSession {
  id: string;
  profileId: 'mustapha';
  trainingDayId: string;
  week: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  loggedSets: LoggedSet[];
  restEndsAt?: string;
  restPausedRemainingSeconds?: number;
}

export interface MealSlot {
  id: string;
  label: string;
  title: string;
  portions: string;
  proteinGrams?: number;
  calories?: number;
}

export interface MealPlan {
  id: string;
  date: string;
  slots: MealSlot[];
  sourceId: 'weight-loss' | 'body-build' | 'crosscooking';
  sourceVersion: '2026-09';
  planVersion: 'mustapha-v1';
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  aisle:
    | 'fruits-legumes'
    | 'viandes-poissons'
    | 'produits-laitiers'
    | 'epicerie'
    | 'surgeles'
    | 'sauces-condiments'
    | 'boissons'
    | 'autres';
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  tags: string[];
  compatibleGoals: Goal[];
  durationMinutes: number;
  difficulty: 'facile' | 'intermédiaire';
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  substitutions: string[];
  allergens: string[];
  estimatedMacros?: { calories: number; protein: number; carbs: number; fat: number };
  status: 'estimé' | 'à vérifier';
  sourceId: 'crosscooking';
  sourceVersion: '2026-09';
  planVersion: 'mustapha-v1';
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  aisle: RecipeIngredient['aisle'];
  checked: boolean;
}

export interface ShoppingList {
  id: 'mustapha-main';
  items: ShoppingItem[];
  updatedAt: string;
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  energy?: number;
  sleepHours?: number;
  waterLiters?: number;
}

export interface AppPreferences {
  id?: 'mustapha';
  sound: boolean;
  vibration: boolean;
  theme: 'dark' | 'light';
}
