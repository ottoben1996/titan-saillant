export type ExerciseMedia = Readonly<{
  start?: string;
  peak?: string;
  main?: string;
  credit: string;
  source: string;
  license: string;
}>;

/**
 * Les visuels vivent sous le chemin de base du site (`/` en local,
 * `/titan-saillant/` sur GitHub Pages). Un chemin absolu écrit en dur pointait
 * sur la racine du domaine et cassait toutes les illustrations en ligne.
 */
const MEDIA_BASE = `${import.meta.env.BASE_URL}exercise-media/`;

const repdb = (slug: string, poses: 'start-peak' | 'main'): ExerciseMedia => ({
  ...(poses === 'main'
    ? { main: `${MEDIA_BASE}${slug}-main.webp` }
    : { start: `${MEDIA_BASE}${slug}-start.webp`, peak: `${MEDIA_BASE}${slug}-peak.webp` }),
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
  'squat-smith': repdb('smith-machine-squat', 'start-peak'),
});
