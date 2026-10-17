/** Libellés affichés pour les identifiants techniques des exercices. */
export const EXERCISE_LABELS: Record<string, string> = {
  velo: 'Vélo stationnaire',
  'tractions-assistees': 'Tractions assistées',
  rameur: 'Rameur',
  cardio: 'Cardio',
  bosu: 'Équilibre sur bosu',
  'coiffe-rotateurs': 'Coiffe des rotateurs',
  'developpe-clavicule': 'Développé clavicule',
  'presse-cuisses-inclinee': 'Presse à cuisses inclinée',
  'leg-curl-allonge': 'Leg curl allongé',
  'chest-press': 'Chest press machine',
  'tirage-horizontal': 'Tirage horizontal',
  'jumping-jack': 'Jumping Jack',
  'gainage-planche': 'Gainage planche',
  'squat-smith': 'Squat Smith machine',
  'leg-extension': 'Leg extension',
  'developpe-couche-machine': 'Développé couché machine',
  'tirage-vertical': 'Tirage vertical',
  skierg: 'SkiErg',
  'hollow-hold': 'Hollow hold',
  'mountain-climber': 'Mountain climber',
  'sit-to-stand': 'Assis-debout',
  crunches: 'Crunches',
  'cooldown-full-body-a': 'Retour au calme — Full Body A',
  'cooldown-full-body-b': 'Retour au calme — Full Body B',
  'cooldown-cardio': 'Retour au calme — Cardio',
};

export function exerciseLabel(id: string, fallback?: string): string {
  return EXERCISE_LABELS[id] ?? fallback ?? id.replace(/-/g, ' ').replace(/^\p{L}/u, (letter) => letter.toUpperCase());
}
