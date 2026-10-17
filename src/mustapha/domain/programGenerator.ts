import { trainingPlan } from './plan';
import type { MustaphaProfile, ProgramSplit, TrainingDay } from './types';

const ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const;

const splitNames: Record<ProgramSplit, string[]> = {
  'full-body': ['Full body A', 'Full body B', 'Full body C', 'Full body D', 'Full body E', 'Full body F'],
  ppl: ['Push', 'Pull', 'Legs', 'Push B', 'Pull B', 'Legs B'],
  'upper-lower': ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C', 'Lower C'],
};
const splitMuscles: Record<ProgramSplit, string[][]> = {
  'full-body': [
    ['Jambes', 'Pectoraux', 'Dos', 'Centre', 'Épaules', 'Ischios'],
    ['Jambes', 'Ischios', 'Épaules', 'Centre'],
  ],
  ppl: [
    ['Pectoraux', 'Épaules', 'Centre'],
    ['Dos', 'Ischios'],
    ['Jambes', 'Ischios', 'Centre'],
  ],
  'upper-lower': [
    ['Pectoraux', 'Dos', 'Épaules', 'Centre'],
    ['Jambes', 'Ischios'],
    ['Pectoraux', 'Dos', 'Épaules'],
    ['Jambes', 'Ischios', 'Centre'],
  ],
};

/** Sélectionne les séances du socle PDF selon le volume et le split choisis. */
export function getTrainingDays(
  profile: Pick<MustaphaProfile, 'weeklySessions' | 'availableDays' | 'split'>,
  week = 1,
): TrainingDay[] {
  const count = Math.min(6, Math.max(2, profile.weeklySessions ?? 3));
  const days = trainingPlan.weeks[week - 1]?.days ?? trainingPlan.weeks[0].days;
  const sourceDays = days.filter((day) => day.kind === 'strength');
  const fallback = sourceDays[0] ?? days[0];
  const names = splitNames[profile.split ?? 'full-body'];
  return Array.from({ length: count }, (_, index) => {
    const source = sourceDays[index % sourceDays.length] ?? fallback;
    const muscles =
      splitMuscles[profile.split ?? 'full-body'][index % splitMuscles[profile.split ?? 'full-body'].length];
    const exercises = source.exercises.filter((exercise) => muscles.some((muscle) => exercise.muscle.includes(muscle)));
    return {
      ...source,
      id: `${source.id}-${profile.split ?? 'full-body'}-${index + 1}`,
      dayLabel: ORDER[index],
      name: names[index],
      focus: `${names[index]} · prescriptions Ottman / Laura`,
      exercises: exercises.length >= 2 ? exercises : source.exercises,
    };
  });
}

export function getSessionLabel(profile: Pick<MustaphaProfile, 'weeklySessions'>): string {
  const count = profile.weeklySessions ?? 3;
  return `${count} séances · ${count >= 5 ? 'volume soutenu' : count >= 4 ? 'rythme régulier' : count === 2 ? 'rythme durable' : 'progression recommandée'}`;
}
