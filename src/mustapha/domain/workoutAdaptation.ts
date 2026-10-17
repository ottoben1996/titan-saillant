import type { ExercisePrescription, TrainingDay } from './types';

export type WorkoutMode = 'full' | 'short' | 'adapted';

export function getWorkoutExercises(day: TrainingDay, mode: WorkoutMode): readonly ExercisePrescription[] {
  if (mode === 'full' || day.exercises.length <= 2) return day.exercises;
  return day.exercises.slice(0, Math.max(2, Math.ceil(day.exercises.length / 2)));
}

export function getWorkoutModeLabel(mode: WorkoutMode): string {
  return mode === 'full' ? 'Séance complète' : mode === 'short' ? 'Version courte · 15 min' : 'Version adaptée';
}

export function getWorkoutTotalSets(day: TrainingDay, mode: WorkoutMode): number {
  return getWorkoutExercises(day, mode).reduce((total, exercise) => total + exercise.sets.length, 0);
}
