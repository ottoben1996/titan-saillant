import type { ExercisePrescription, Recipe, TrainingDay, TrainingPlan } from './types';

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
};

const strength = (
  id: string,
  name: string,
  muscle: string,
  reps: number,
  loadKg?: number,
  restSeconds = 90,
  tempo = '2-0-2',
) => ({
  id,
  name,
  muscle,
  sets: Array.from({ length: 3 }, () => ({
    repetitions: reps,
    loadKg,
    restSeconds,
    tempo,
    method: 'straight-set' as const,
  })),
});
const timed = (id: string, name: string, muscle: string, seconds: number, restSeconds = 45) => ({
  id,
  name,
  muscle,
  sets: Array.from({ length: 3 }, () => ({ durationSeconds: seconds, restSeconds, method: 'amrap' as const })),
});

const weekDays = (week: number): TrainingDay[] => {
  const scale = 1 + (week - 1) * 0.025;
  const day = (
    id: string,
    dayLabel: string,
    name: string,
    focus: string,
    exercises: ExercisePrescription[],
  ): TrainingDay => ({ id: `${id}-w${week}`, week, dayLabel, name, kind: 'strength', focus, exercises });
  return [
    day('full-body-a', 'Lundi', 'Full body A', 'Jambes · poussée · gainage', [
      strength('goblet-squat', 'Goblet squat', 'Jambes', 10, Math.round(20 * scale), 105),
      strength('chest-press', 'Chest press machine', 'Pectoraux', 10, Math.round(35 * scale), 90),
      strength('row', 'Tirage horizontal', 'Dos', 12, Math.round(35 * scale), 90),
      timed('plank', 'Gainage planche', 'Centre', 30, 45),
    ]),
    day('full-body-b', 'Mercredi', 'Full body B', 'Chaîne postérieure · épaules', [
      strength('leg-press', 'Presse à cuisses', 'Jambes', 12, Math.round(70 * scale), 120),
      strength('rdl', 'Soulevé de terre roumain haltères', 'Ischios', 10, Math.round(18 * scale), 105),
      strength('shoulder-press', 'Développé épaules', 'Épaules', 10, Math.round(14 * scale), 90),
      timed('dead-bug', 'Dead bug', 'Centre', 40, 45),
    ]),
    {
      id: `cardio-w${week}`,
      week,
      dayLabel: 'Samedi',
      name: 'Cardio & mobilité',
      kind: 'cardio',
      focus: 'Endurance progressive et récupération',
      exercises: [
        timed('bike', 'Vélo ou marche inclinée', 'Cardio', 600, 60),
        timed('mountain-climber', 'Mountain climbers', 'Cardio', 30, 45),
        timed('mobility', 'Mobilité hanches/épaules', 'Mobilité', 300, 0),
      ],
    },
    {
      id: `rest-w${week}`,
      week,
      dayLabel: 'Dimanche',
      name: 'Repos actif',
      kind: 'active-rest',
      focus: 'Marche douce, respiration, sommeil',
      exercises: [],
    },
  ];
};

export const trainingPlan: TrainingPlan = deepFreeze({
  id: 'mustapha-v1',
  sourceId: 'body-build',
  sourceVersion: '2026-09',
  planVersion: 'mustapha-v1',
  weeks: Array.from({ length: 8 }, (_, index) => ({
    week: index + 1,
    label: `Semaine ${index + 1}`,
    days: weekDays(index + 1),
  })),
});

export const recipes: Recipe[] = deepFreeze([
  {
    id: 'chicken-bowl',
    name: 'Bowl poulet, riz & crudités',
    category: 'Bowl',
    tags: ['protéiné', 'meal-prep', 'rapide'],
    compatibleGoals: ['fat-loss', 'maintenance', 'recomposition', 'muscle-gain'],
    durationMinutes: 25,
    difficulty: 'facile',
    servings: 2,
    ingredients: [
      { name: 'Blanc de poulet', quantity: 300, unit: 'g', aisle: 'viandes-poissons' },
      { name: 'Riz', quantity: 160, unit: 'g', aisle: 'epicerie' },
      { name: 'Concombre', quantity: 1, unit: 'pièce', aisle: 'fruits-legumes' },
      { name: 'Yaourt grec', quantity: 100, unit: 'g', aisle: 'produits-laitiers' },
    ],
    steps: ['Cuire le riz et le poulet.', 'Découper les crudités.', 'Assembler et ajouter la sauce au yaourt.'],
    substitutions: ['Poulet → tofu ferme', 'Riz → quinoa'],
    allergens: ['lait'],
    estimatedMacros: { calories: 540, protein: 44, carbs: 55, fat: 14 },
    status: 'estimé',
    sourceId: 'crosscooking',
    sourceVersion: '2026-09',
    planVersion: 'mustapha-v1',
  },
  {
    id: 'turkey-wrap',
    name: 'Wrap dinde, houmous & légumes',
    category: 'Wrap',
    tags: ['protéiné', 'rapide'],
    compatibleGoals: ['fat-loss', 'maintenance', 'recomposition', 'muscle-gain'],
    durationMinutes: 10,
    difficulty: 'facile',
    servings: 1,
    ingredients: [
      { name: 'Tortilla complète', quantity: 1, unit: 'pièce', aisle: 'epicerie' },
      { name: 'Dinde', quantity: 120, unit: 'g', aisle: 'viandes-poissons' },
      { name: 'Houmous', quantity: 40, unit: 'g', aisle: 'sauces-condiments' },
      { name: 'Tomate', quantity: 1, unit: 'pièce', aisle: 'fruits-legumes' },
    ],
    steps: ['Tartiner le houmous.', 'Ajouter la dinde et les légumes.', 'Rouler et servir.'],
    substitutions: ['Dinde → thon', 'Houmous → fromage frais'],
    allergens: ['gluten'],
    estimatedMacros: { calories: 390, protein: 30, carbs: 38, fat: 12 },
    status: 'estimé',
    sourceId: 'crosscooking',
    sourceVersion: '2026-09',
    planVersion: 'mustapha-v1',
  },
  {
    id: 'oats-yogurt',
    name: 'Overnight oats protéinés',
    category: 'Petit-déjeuner',
    tags: ['protéiné', 'meal-prep'],
    compatibleGoals: ['maintenance', 'recomposition', 'muscle-gain'],
    durationMinutes: 5,
    difficulty: 'facile',
    servings: 1,
    ingredients: [
      { name: 'Flocons d’avoine', quantity: 60, unit: 'g', aisle: 'epicerie' },
      { name: 'Yaourt grec', quantity: 150, unit: 'g', aisle: 'produits-laitiers' },
      { name: 'Banane', quantity: 1, unit: 'pièce', aisle: 'fruits-legumes' },
      { name: 'Graines de chia', quantity: 10, unit: 'g', aisle: 'epicerie' },
    ],
    steps: ['Mélanger tous les ingrédients.', 'Réfrigérer une nuit.', 'Ajouter le fruit avant de manger.'],
    substitutions: ['Yaourt grec → skyr'],
    allergens: ['lait'],
    estimatedMacros: { calories: 420, protein: 27, carbs: 54, fat: 11 },
    status: 'estimé',
    sourceId: 'crosscooking',
    sourceVersion: '2026-09',
    planVersion: 'mustapha-v1',
  },
  {
    id: 'smoothie',
    name: 'Smoothie banane & fruits rouges',
    category: 'Smoothie',
    tags: ['rapide', 'collation'],
    compatibleGoals: ['maintenance', 'recomposition', 'muscle-gain'],
    durationMinutes: 5,
    difficulty: 'facile',
    servings: 1,
    ingredients: [
      { name: 'Fruits rouges surgelés', quantity: 150, unit: 'g', aisle: 'surgeles' },
      { name: 'Banane', quantity: 1, unit: 'pièce', aisle: 'fruits-legumes' },
      { name: 'Lait', quantity: 250, unit: 'ml', aisle: 'produits-laitiers' },
    ],
    steps: ['Mixer tous les ingrédients.', 'Boire frais.'],
    substitutions: ['Lait → boisson végétale'],
    allergens: ['lait'],
    estimatedMacros: { calories: 240, protein: 10, carbs: 42, fat: 4 },
    status: 'à vérifier',
    sourceId: 'crosscooking',
    sourceVersion: '2026-09',
    planVersion: 'mustapha-v1',
  },
]);

export function getTodayTrainingDay(date = new Date()) {
  const week = Math.min(8, Math.max(1, Number(localStorage.getItem('mustapha-current-week') ?? 1)));
  const days = trainingPlan.weeks[week - 1].days;
  const dayIndex = date.getDay();
  return days[((dayIndex + 6) % 7) % days.length] ?? days[0];
}
