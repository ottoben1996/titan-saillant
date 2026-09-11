export type ExerciseMedia = Readonly<{
  start?: string;
  peak?: string;
  main?: string;
  credit: string;
  source: string;
  license: string;
}>;

const repdb = (slug: string, poses: 'start-peak' | 'main'): ExerciseMedia => ({
  ...(poses === 'main'
    ? { main: `/exercise-media/${slug}-main.webp` }
    : { start: `/exercise-media/${slug}-start.webp`, peak: `/exercise-media/${slug}-peak.webp` }),
  credit: 'Exercise data by RepDB (repdb.co)',
  source: 'https://exercise-dataset.com/',
  license: 'Utilisation commerciale dans l’application avec attribution visible.',
});

export const exerciseMedia: Readonly<Record<string, ExerciseMedia>> = Object.freeze({
  'coiffe-rotateurs': repdb('cable-external-rotation', 'start-peak'),
  rameur: repdb('rowing-machine', 'start-peak'),
  velo: repdb('stationary-bike', 'main'),
  'presse-cuisses-inclinee': repdb('leg-press', 'start-peak'),
  'leg-curl-allonge': repdb('leg-curl', 'start-peak'),
  'chest-press': repdb('chest-press-machine', 'start-peak'),
  'tirage-horizontal': repdb('seated-cable-row', 'start-peak'),
  'jumping-jack': repdb('jumping-jacks', 'start-peak'),
  'gainage-planche': repdb('plank', 'main'),
  'leg-extension': repdb('leg-extension', 'start-peak'),
  'developpe-couche-machine': repdb('chest-press-machine', 'start-peak'),
  'tirage-vertical': repdb('close-grip-lat-pulldown', 'start-peak'),
  'hollow-hold': repdb('hollow-body-hold', 'main'),
  'mountain-climber': repdb('mountain-climbers', 'start-peak'),
  crunches: repdb('crunches', 'start-peak'),
  'developpe-clavicule': repdb('dumbbell-shoulder-press', 'start-peak'),
});
